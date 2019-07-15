/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*

Necessary scripts:

POST _scripts/map-service-conns
{
  "script": {
    "lang": "painless",
    "source": """
              def s = new HashMap();

              if (!doc['span.id'].empty) {
                s.id = doc['span.id'].value
              } else {
                s.id = doc['transaction.id'].value;
                s.transaction = true;
              }
              if (!doc['parent.id'].empty) {
                s.parent = doc['parent.id'].value;
              }
              if (!doc['service.environment'].empty) {
                s.environment = doc['service.environment'].value;
              }
             
              if (!doc['destination.address'].empty) {
                s.destination = doc['destination.address'].value;
              }
              
              if (!doc['_index'].empty) {
                s._index = doc['_index'].value;
              }
              
              if (!doc['span.type'].empty) {
                s.span_type = doc['span.type'].value;
              }
              
              if (!doc['span.subtype'].empty) {
                s.span_subtype = doc['span.subtype'].value;
              }
              
              s.timestamp = doc['@timestamp'].value;
              s.service_name = doc['service.name'].value;
              if(!state.spans.containsKey(s.parent)) {
                state.spans.put(s.parent, new ArrayList())
              }
              
              if (s.parent != s.id) {
                state.spans[s.parent].add(s)
              }
            """
  }
}

POST _scripts/reduce-service-conns
{
  "script": {
    "lang": "painless",
    "source": """
              void extractChildren(def caller, def spans, def upstream, def conns, def count) {
                // TODO: simplify this
                if (spans.containsKey(caller.id)) {
                  for(s in spans[caller.id]) {
                      if (caller.span_type=='external') {
                        upstream.add(caller.service_name+"/"+caller.environment);
  
                        def conn = new HashMap();
                        conn.caller = caller;
                        conn.callee = s;
                        conn.upstream = new ArrayList(upstream);
                        conns.add(conn);
                        
                        extractChildren(s, spans, upstream, conns, count);
                        upstream.remove(upstream.size()-1);
                      } else {
                        extractChildren(s, spans, upstream, conns, count);
                      }
                  }
                } else {
                  // no connection found
                  def conn = new HashMap();
                  conn.caller = caller;
                  conn.upstream = new ArrayList(upstream);
                  conn.upstream.add(caller.service_name+"/"+caller.environment);
                  conns.add(conn);
                }
              }
              def conns = new HashSet();
              def spans = new HashMap();
              
              // merge results from shards
              for(state in states) {
                for(s in state.entrySet()) {
                  def v = s.getValue();
                  def k = s.getKey();
                  if(!spans.containsKey(k)) {
                    spans[k] = v;
                  } else {
                    for (p in v) {
                      spans[k].add(p);
                    }
                  }
                }
              }
              
              if (spans.containsKey(null) && spans[null].size() > 0) {
                def node = spans[null][0];
                def upstream = new ArrayList();
              
                extractChildren(node, spans, upstream, conns, 0);

                return new ArrayList(conns)
              }
              return [];
            """
  }
}

POST _scripts/combine-service-conns
{
  "script": {
    "lang": "painless",
    "source": "return state.spans"
  }
}



PUT /_ingest/pipeline/extract_destination
{
  "description": "sets destination on ext spans based on their name",
  "processors": [
    {
        "set": {
          "if": "ctx.span != null && ctx.span.type == 'ext'",
          "field": "span.type",
          "value": "external"
        }
    },
    {
        "script": """
        if(ctx['span'] != null) {
          if (ctx['span']['type'] == 'external') {
            def spanName = ctx['span']['name'];
            if (spanName.indexOf('/') > -1) {
              spanName = spanName.substring(0, spanName.indexOf('/'));
            }
            
            if (spanName.indexOf(' ') > -1) {
              spanName = spanName.substring(spanName.indexOf(' ')+1, spanName.length());
            }
            ctx['destination.address']=spanName;
          }
          
          if (ctx['span']['type'] == 'resource') {
            def spanName = ctx['span']['name'];
            
            if (spanName.indexOf('://') > -1) {
              spanName = spanName.substring(spanName.indexOf('://')+3, spanName.length());
            }
            if (spanName.indexOf('/') > -1) {
              spanName = spanName.substring(0, spanName.indexOf('/'));
            }
            
            ctx['destination.address']=spanName;
          }
          
          if (ctx['span']['type'] == 'db') {
            def dest = ctx['span']['subtype'];
            ctx['destination.address']=dest;
          }
          
          if (ctx['span']['type'] == 'cache') {
            def dest = ctx['span']['subtype'];
            ctx['destination.address']=dest;
          }
        }
        """
      }
  ]
}

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
          size: 200
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
        ],
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

export async function serviceMapRun(kbnServer, config, lastRun?: string) {
  const apmIdxPattern = config.get('apm_oss.indexPattern');
  const serviceConnsDestinationIndex = config.get(
    'apm_oss.serviceMapDestinationIndex'
  );
  const serviceConnsDestinationPipeline = config.get(
    'apm_oss.serviceMapDestinationPipeline'
  );

  const callCluster = kbnServer.server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;

  let mostRecent = '';
  let afterKey = null;
  // console.log('HELLO TASK', lastRun);
  while (true) {
    const q = interestingTransactions(lastRun, afterKey);
    const txs = await callCluster('search', {
      index: apmIdxPattern,
      body: q
    });

    if (txs.aggregations['ext-conns'].buckets.length < 1) {
      // console.log('No buckets');
      // console.log(JSON.stringify(q));
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

    const connDocs = [];

    connsResult.aggregations.trace_id.buckets.forEach((bucket: any) => {
      const allServices = new Set<string>(
        bucket.connections.value.map(
          (conn: any) =>
            conn.caller.service_name +
            '/' +
            (conn.caller.environment ? conn.caller.environment : 'null')
        )
      );

      bucket.connections.value.forEach((conn: any) => {
        const index = serviceConnsDestinationIndex
          ? serviceConnsDestinationIndex
          : conn.caller._index;
        const bulkOpts = { index: { _index: index } };

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

    // console.log(JSON.stringify(connDocs));
    const body = connDocs.map(JSON.stringify).join('\n');
    // console.log(body);
    const bulkResult = await callCluster('bulk', {
      body
    });
    // TODO: check result
  }
}
