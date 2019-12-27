/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq, find, isEqual, take } from 'lodash';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  DESTINATION_ADDRESS,
  PROCESSOR_EVENT,
  PARENT_ID,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  TRACE_ID
} from '../../../common/elasticsearch_fieldnames';
import { ESFilter } from '../../../typings/elasticsearch';
import {
  Connection,
  ServiceConnectionNode,
  ConnectionNode
} from '../../../common/service_map';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  environment?: string;
  after?: string;
}

const MAX_TRACES_TO_INSPECT = 1000;

export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap({
  setup,
  serviceName,
  environment,
  after
}: IEnvOptions) {
  const isTop = !after;
  const isAll = !serviceName;

  const { indices, start, end, client } = setup;

  let sampleIndices = [
    indices['apm_oss.spanIndices'],
    indices['apm_oss.transactionIndices']
  ];

  let processorEvents = ['span', 'transaction'];

  let rangeQuery = { range: rangeFilter(start, end) };

  if (isTop) {
    sampleIndices = [indices['apm_oss.transactionIndices']];
    processorEvents = ['transaction'];
    rangeQuery = { range: rangeFilter(end - 60 * 60 * 1000, end) };
  }

  const query = {
    bool: {
      filter: [
        { terms: { [PROCESSOR_EVENT]: processorEvents } },
        rangeQuery
      ] as ESFilter[]
    }
  } as { bool: { filter: ESFilter[]; must_not?: ESFilter[] | ESFilter } };

  if (serviceName) {
    query.bool.filter.push({ term: { [SERVICE_NAME]: serviceName } });
  }

  if (environment) {
    query.bool.filter.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  }

  if (isTop && isAll) {
    query.bool.must_not = { exists: { field: PARENT_ID } };
  }

  const afterObj =
    after && after !== 'top'
      ? { after: JSON.parse(Buffer.from(after, 'base64').toString()) }
      : {};

  const params = {
    index: sampleIndices,
    body: {
      size: 0,
      query,
      aggs: {
        connections: {
          composite: {
            size: 1000,
            ...afterObj,
            sources: [
              { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
              {
                [SERVICE_ENVIRONMENT]: {
                  terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true }
                }
              },
              {
                [TRANSACTION_TYPE]: {
                  terms: { field: TRANSACTION_TYPE, missing_bucket: true }
                }
              },
              {
                [TRANSACTION_NAME]: {
                  terms: { field: TRANSACTION_NAME, missing_bucket: true }
                }
              },
              {
                [SPAN_TYPE]: {
                  terms: { field: SPAN_TYPE, missing_bucket: true }
                }
              },
              {
                [SPAN_SUBTYPE]: {
                  terms: { field: SPAN_SUBTYPE, missing_bucket: true }
                }
              },
              {
                [DESTINATION_ADDRESS]: {
                  terms: { field: DESTINATION_ADDRESS, missing_bucket: true }
                }
              }
            ]
          },
          aggs: {
            trace_ids: {
              terms: {
                field: 'trace.id',
                execution_hint: 'map' as const
              }
            }
          }
        }
      }
    }
  };

  const tracesSampleResponse = await client.search(params);

  const traceIds =
    tracesSampleResponse.aggregations?.connections.buckets.flatMap(bucket =>
      bucket.trace_ids.buckets.map(traceBucket => traceBucket.key as string)
    ) || [];

  const serviceMapParams = {
    index: [
      indices['apm_oss.spanIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                [TRACE_ID]: uniq(take(traceIds, MAX_TRACES_TO_INSPECT))
              }
            }
          ]
        }
      },
      aggs: {
        service_map: {
          scripted_metric: {
            init_script: {
              lang: 'painless',
              source: `state.eventsById = new HashMap();
                state.connectionsById = new HashMap();

                String[] fieldsToCopy = new String[] {
                  'parent.id',
                  'service.name',
                  'service.environment',
                  'destination.address',
                  'trace.id',
                  'agent.name',
                  'processor.event'
                };
                state.fieldsToCopy = fieldsToCopy;`
            },
            map_script: {
              lang: 'painless',
              source: `def id;
                if (!doc['span.id'].empty) {  
                  id = doc['span.id'].value;
                } else {
                  id = doc['transaction.id'].value;
                }

                def copy = new HashMap();
                copy.id = id;

                for(key in state.fieldsToCopy) {
                  if (!doc[key].empty) {
                    copy[key] = doc[key].value;
                  }
                }

                state.eventsById[id] = copy`
            },
            combine_script: {
              lang: 'painless',
              source: `return state.eventsById;`
            },
            reduce_script: {
              lang: 'painless',
              source: `def processAndReturnEvent(def context, def eventId) {
                if (context.processedEvents[eventId] != null) {
                  return context.processedEvents[eventId];
                }
                
                def event = context.eventsById[eventId];

                if (event == null) {
                  return null;
                }

                def service = new HashMap();
                service['service.name'] = event['service.name'];
                service['service.environment'] = event['service.environment'];
                service['agent.name'] = event['agent.name'];

                def basePath = new ArrayList();

                def parentId = event['parent.id'];
                def parent;

                if (parentId != null && parentId != event['id']) {
                  parent = processAndReturnEvent(context, parentId);
                  if (parent != null) {
                    /* copy the path from the parent */
                    basePath.addAll(parent.path);
                    /* flag parent path for removal, as it has children */
                    context.locationsToRemove.add(parent.path.hashCode());

                    /* if the parent has 'destination.address' set, and the service is different,
                    we've discovered a service */

                    if (parent['destination.address'] != null
                      && parent['destination.address'] != ""
                      && (parent['service.name'] != event['service.name']
                        || parent['service.environment'] != event['service.environment']
                      )
                    ) {
                      context.externalToServiceMap[parent['destination.address']] = service;
                    }
                  }
                }

                def lastLocation = basePath.size() > 0 ? basePath[basePath.size() - 1] : null;

                def currentLocation = new HashMap(service);

                /* only add the current location to the path if it's different from the last one*/
                if (lastLocation == null || !lastLocation.equals(currentLocation)) {
                  basePath.add(currentLocation);
                }

                /* if there is an outgoing span, create a new path */
                if (event['destination.address'] != null && event['destination.address'] != '') {
                  def outgoingLocation = new HashMap();
                  outgoingLocation['destination.address'] = event['destination.address'];
                  def outgoingPath = new ArrayList(basePath);
                  outgoingPath.add(outgoingLocation);
                  context.paths.add(outgoingPath);
                }

                event.path = basePath;
                
                context.paths.add(event.path);

                context.processedEvents[eventId] = event;
                return event;
              }

              def context = new HashMap();

              context.processedEvents = new HashMap();
              context.eventsById = new HashMap();
              
              context.paths = new HashSet();
              context.externalToServiceMap = new HashMap();
              context.locationsToRemove = new HashSet();

              for (state in states) {
                context.eventsById.putAll(state);
              }

              for (entry in context.eventsById.entrySet()) {
                processAndReturnEvent(context, entry.getKey());
              }

              def paths = new HashSet();

              for(foundPath in context.paths) {
                if (!context.locationsToRemove.contains(foundPath.hashCode())) {  
                  paths.add(foundPath); 
                }
              }

              def response = new HashMap();
              response.paths = paths;
              response.externalToServiceMap = context.externalToServiceMap;
              
              return response;`
            }
          }
        }
      }
    }
  };

  const serviceMapResponse = await client.search(serviceMapParams);

  let nextAfter: string | undefined;

  const receivedAfterKey =
    tracesSampleResponse.aggregations?.connections.after_key;

  if (!after) {
    nextAfter = 'top';
  } else if (receivedAfterKey) {
    nextAfter = Buffer.from(JSON.stringify(receivedAfterKey)).toString(
      'base64'
    );
  }

  const scriptResponse = serviceMapResponse.aggregations?.service_map.value as {
    paths: ConnectionNode[][];
    externalToServiceMap: Record<string, ServiceConnectionNode>;
  };

  let paths = scriptResponse.paths;

  if (serviceName || environment) {
    paths = paths.filter(path => {
      return path.some(node => {
        let matches = true;
        if (serviceName) {
          matches =
            matches &&
            'service.name' in node &&
            node['service.name'] === serviceName;
        }
        if (environment) {
          matches =
            matches &&
            'service.environment' in node &&
            node['service.environment'] === environment;
        }
        return matches;
      });
    });
  }

  const connections = uniq(
    paths.flatMap(path => {
      return path.reduce((conns, location, index) => {
        const prev = path[index - 1];
        if (prev && !isEqual(prev, location)) {
          return conns.concat({
            source: prev,
            destination: location
          });
        }
        return conns;
      }, [] as Connection[]);
    }, [] as Connection[]),
    (value, index, array) => {
      return find(array, value);
    }
  );

  return {
    connections,
    destinationMap: scriptResponse.externalToServiceMap,
    after: nextAfter
  };
}
