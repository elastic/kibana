/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function interestingTransactions(since?: string, afterKey?: any) {
  if (!since) {
    since = 'now-1h';
  }
  const query = {
    size: 0,
    query: {
      bool: {
        filter: [
          { exists: { field: 'destination.address' } },
          { exists: { field: 'trace.id' } },
          { exists: { field: 'span.duration.us' } },
          { range: { '@timestamp': { gt: since } } }
        ]
      }
    },
    aggs: {
      'ext-conns': {
        composite: {
          sources: [
            { 'service.name': { terms: { field: 'service.name' } } },
            { 'span.type': { terms: { field: 'span.type' } } },
            {
              'span.subtype': {
                terms: { field: 'span.subtype', missing_bucket: true }
              }
            },
            {
              'service.environment': {
                terms: { field: 'service.environment', missing_bucket: true }
              }
            },
            {
              'destination.address': { terms: { field: 'destination.address' } }
            }
          ],
          // TODO: needs to be balanced with the 20 below
          size: 200,
          after: undefined
        },
        aggs: {
          smpl: {
            diversified_sampler: {
              shard_size: 20,
              script: {
                lang: 'painless',
                source: "(int)doc['span.duration.us'].value/100000"
              }
            },
            aggs: {
              tracesample: {
                top_hits: {
                  size: 20,
                  _source: ['trace.id', '@timestamp']
                }
              }
            }
          }
        }
      }
    }
  };

  if (afterKey) {
    query.aggs['ext-conns'].composite.after = afterKey;
  }
  return query;
}

function findConns(traceIds: string[]) {
  const query = {
    size: 0,
    query: {
      bool: {
        should: [
          { exists: { field: 'span.id' } },
          { exists: { field: 'transaction.type' } }
        ] as any[],
        minimum_should_match: 2
      }
    },
    aggs: {
      trace_id: {
        terms: {
          field: 'trace.id',
          order: { _key: 'asc' },
          size: traceIds.length
        },
        aggs: {
          connections: {
            scripted_metric: {
              init_script: 'state.spans = new HashMap();',
              map_script: { id: 'map-service-conns' },
              combine_script: { id: 'combine-service-conns' },
              reduce_script: { id: 'reduce-service-conns' }
            }
          }
        }
      }
    }
  };

  for (const tid of traceIds) {
    query.query.bool.should.push({ term: { 'trace.id': tid } });
  }
  return query;
}

interface Service {
  name: string;
  environment?: string;
}

interface ConnectionDoc {
  '@timestamp': string;
  observer: { version_major: number }; // TODO: make this dynamic
  service: Service;
  callee?: Service;
  connection: Connection;
  destination?: { address: string };
}

interface Connection {
  upstream: { list: string[]; keyword: string };
  in_trace: string[];
  type: string;
  subtype?: string;
}

export async function runServiceMapTask(
  kbnServer: any,
  config: any,
  lastRun?: string
) {
  const apmIdxPattern = config.get('apm_oss.indexPattern');
  const serviceConnsDestinationIndex = config.get(
    'xpack.apm.serviceMapDestinationIndex'
  );
  const serviceConnsDestinationPipeline = config.get(
    'xpack.apm.serviceMapDestinationPipeline'
  );

  const callCluster = kbnServer.server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;

  let mostRecent = '';
  let afterKey = null;
  while (true) {
    const q = interestingTransactions(lastRun, afterKey);
    const txs = await callCluster('search', {
      index: apmIdxPattern,
      body: q
    });

    if (txs.aggregations['ext-conns'].buckets.length < 1) {
      return { mostRecent };
    }
    afterKey = txs.aggregations['ext-conns'].after_key;

    const traces = new Set<string>();

    txs.aggregations['ext-conns'].buckets.forEach((bucket: any) => {
      bucket.smpl.tracesample.hits.hits.forEach((hit: any) => {
        traces.add(hit._source.trace.id);
        mostRecent =
          mostRecent > hit._source['@timestamp']
            ? mostRecent
            : hit._source['@timestamp'];
      });
    });

    const traceIds = Array.from(traces.values());
    if (traceIds.length < 1) {
      return { mostRecent: null };
    }

    const findConnsQ = findConns(traceIds);

    const connsResult = await callCluster('search', {
      index: apmIdxPattern,
      body: findConnsQ
    });

    const connDocs: Array<{ index: { _index: any } } | ConnectionDoc> = [];

    connsResult.aggregations.trace_id.buckets.forEach((bucket: any) => {
      const allServices = new Set<string>(
        bucket.connections.value.map(
          (conn: any) =>
            `${conn.caller.service_name}/${conn.caller.environment || 'null'}`
        )
      );

      bucket.connections.value.forEach((conn: any) => {
        const index = serviceConnsDestinationIndex
          ? serviceConnsDestinationIndex
          : conn.caller._index;
        const bulkOpts = { index: { _index: index }, pipeline: undefined };

        if (serviceConnsDestinationPipeline) {
          bulkOpts.pipeline = serviceConnsDestinationPipeline;
        }
        connDocs.push(bulkOpts);
        const doc: ConnectionDoc = {
          '@timestamp': conn.caller.timestamp,
          observer: { version_major: 7 }, // TODO: make this dynamic
          service: {
            name: conn.caller.service_name,
            environment: conn.caller.environment
          },
          callee: conn.callee
            ? {
                name: conn.callee.service_name,
                environment: conn.callee.environment
              }
            : undefined,
          connection: {
            upstream: {
              list: conn.upstream,
              keyword: conn.upstream.join('->')
            },
            in_trace: Array.from(allServices),
            type: conn.caller.span_type,
            subtype: conn.caller.span_substype
          },
          destination: conn.caller.destination
            ? { address: conn.caller.destination }
            : undefined
        };

        connDocs.push(doc);
      });
    });

    const body = connDocs
      .map((connDoc: any) => JSON.stringify(connDoc))
      .join('\n');
    await callCluster('bulk', {
      body
    });
  }
}
