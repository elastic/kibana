/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

const MAP_SERVICE_CONNS_SCRIPT_ID = 'map-service-conns';
const REDUCE_SERVICE_CONNS_SCRIPT_ID = 'reduce-service-conns';
const COMBINE_SERVICE_CONNS_SCRIPT_ID = 'combine-service-conns';
const EXTRACT_DESTINATION_INGEST_PIPELINE_ID = 'extract_destination';
const APM_INGEST_PIPELINE_ID = 'apm';

async function putScriptMapServiceConns(callCluster: CallCluster) {
  return await callCluster('putScript', {
    id: MAP_SERVICE_CONNS_SCRIPT_ID,
    body: {
      script: {
        lang: 'painless',
        source: `
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
        `
      }
    }
  });
}

async function putScriptReduceServiceConns(callCluster: CallCluster) {
  return await callCluster('putScript', {
    id: REDUCE_SERVICE_CONNS_SCRIPT_ID,
    body: {
      script: {
        lang: 'painless',
        source: `
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
        `
      }
    }
  });
}

async function putScriptCombineServiceConns(callCluster: CallCluster) {
  return await callCluster('putScript', {
    id: COMBINE_SERVICE_CONNS_SCRIPT_ID,
    body: {
      script: {
        lang: 'painless',
        source: `return state.spans`
      }
    }
  });
}

async function putIngestPipelineExtractDestination(callCluster: CallCluster) {
  return await callCluster('ingest.putPipeline', {
    id: EXTRACT_DESTINATION_INGEST_PIPELINE_ID,
    body: {
      description: 'sets destination on ext spans based on their name',
      processors: [
        {
          set: {
            if: "ctx.span != null && ctx.span.type == 'ext'",
            field: 'span.type',
            value: 'external'
          }
        },
        {
          script: `
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
          `
        }
      ]
    }
  });
}

interface ApmIngestPipeline {
  [APM_INGEST_PIPELINE_ID]: {
    description: string;
    processors: Array<{
      pipeline: {
        name: string;
      };
    }>;
  };
}

async function getIngestPipelineApm(
  callCluster: CallCluster
): Promise<ApmIngestPipeline> {
  return await callCluster('ingest.getPipeline', {
    id: APM_INGEST_PIPELINE_ID
  });
}

async function putIngestPipelineApm(
  callCluster: CallCluster,
  processors: ApmIngestPipeline[typeof APM_INGEST_PIPELINE_ID]['processors']
) {
  return await callCluster('ingest.putPipeline', {
    id: APM_INGEST_PIPELINE_ID,
    body: {
      description: 'Default enrichment for APM events',
      processors
    }
  });
}

async function applyExtractDestinationToApm(callCluster: CallCluster) {
  let apmIngestPipeline: ApmIngestPipeline;
  try {
    // get current apm ingest pipeline
    apmIngestPipeline = await getIngestPipelineApm(callCluster);
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
    // create apm ingest pipeline if it doesn't exist
    return await putIngestPipelineApm(callCluster, [
      {
        pipeline: {
          name: EXTRACT_DESTINATION_INGEST_PIPELINE_ID
        }
      }
    ]);
  }

  const {
    apm: { processors }
  } = apmIngestPipeline;

  // check if 'extract destination' processor is already applied
  if (
    processors.find(
      ({ pipeline: { name } }) =>
        name === EXTRACT_DESTINATION_INGEST_PIPELINE_ID
    )
  ) {
    return apmIngestPipeline;
  }

  // append 'extract destination' to existing processors
  return await putIngestPipelineApm(callCluster, [
    ...processors,
    {
      pipeline: {
        name: EXTRACT_DESTINATION_INGEST_PIPELINE_ID
      }
    }
  ]);
}

export async function setupRequiredScripts(server: Legacy.Server) {
  const callCluster = server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;

  const putRequiredScriptsResults = await Promise.all([
    putScriptMapServiceConns(callCluster),
    putScriptReduceServiceConns(callCluster),
    putScriptCombineServiceConns(callCluster),
    putIngestPipelineExtractDestination(callCluster) // TODO remove this when agents set destination.address (elastic/apm#115)
  ]);

  return [
    ...putRequiredScriptsResults,
    await applyExtractDestinationToApm(callCluster) // TODO remove this when agents set destination.address (elastic/apm#115)
  ];
}
