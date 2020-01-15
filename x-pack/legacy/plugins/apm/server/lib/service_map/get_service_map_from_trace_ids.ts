/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq, find } from 'lodash';
import { Setup } from '../helpers/setup_request';
import {
  TRACE_ID,
  PROCESSOR_EVENT
} from '../../../common/elasticsearch_fieldnames';
import {
  Connection,
  ServiceConnectionNode,
  ConnectionNode,
  ExternalConnectionNode
} from '../../../common/service_map';

export async function getServiceMapFromTraceIds({
  setup,
  traceIds,
  serviceName,
  environment
}: {
  setup: Setup;
  traceIds: string[];
  serviceName?: string;
  environment?: string;
}) {
  const { indices, client } = setup;

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
                [PROCESSOR_EVENT]: ['span', 'transaction']
              }
            },
            {
              terms: {
                [TRACE_ID]: traceIds
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

                String[] fieldsToCopy = new String[] {
                  'parent.id',
                  'service.name',
                  'service.environment',
                  'destination.address',
                  'trace.id',
                  'processor.event',
                  'span.type',
                  'span.subtype',
                  'agent.name'
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
              source: `
              def getDestination ( def event ) {
                def destination = new HashMap();
                destination['destination.address'] = event['destination.address'];
                destination['span.type'] = event['span.type'];
                destination['span.subtype'] = event['span.subtype'];
                return destination;
              }

              def processAndReturnEvent(def context, def eventId) {
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
                    context.locationsToRemove.add(parent.path);

                    /* if the parent has 'destination.address' set, and the service is different,
                    we've discovered a service */

                    if (parent['destination.address'] != null
                      && parent['destination.address'] != ""
                      && (parent['span.type'] == 'external'
                        || parent['span.type'] == 'messaging')
                      && (parent['service.name'] != event['service.name']
                        || parent['service.environment'] != event['service.environment']
                      )
                    ) {
                      def parentDestination = getDestination(parent);
                      context.externalToServiceMap.put(parentDestination, service);
                    }
                  }
                }

                def lastLocation = basePath.size() > 0 ? basePath[basePath.size() - 1] : null;

                def currentLocation = service;

                /* only add the current location to the path if it's different from the last one*/
                if (lastLocation == null || !lastLocation.equals(currentLocation)) {
                  basePath.add(currentLocation);
                }

                /* if there is an outgoing span, create a new path */
                if (event['destination.address'] != null
                  && event['destination.address'] != '') {
                  def outgoingLocation = getDestination(event);
                  def outgoingPath = new ArrayList(basePath);
                  outgoingPath.add(outgoingLocation);
                  context.paths.add(outgoingPath);
                }

                event.path = basePath;

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
                if (!context.locationsToRemove.contains(foundPath)) {
                  paths.add(foundPath);
                }
              }

              def response = new HashMap();
              response.paths = paths;

              def discoveredServices = new HashSet();

              for(entry in context.externalToServiceMap.entrySet()) {
                def map = new HashMap();
                map.from = entry.getKey();
                map.to = entry.getValue();
                discoveredServices.add(map);
              }
              response.discoveredServices = discoveredServices;

              return response;`
            }
          }
        }
      }
    }
  };

  const serviceMapResponse = await client.search(serviceMapParams);

  const scriptResponse = serviceMapResponse.aggregations?.service_map.value as {
    paths: ConnectionNode[][];
    discoveredServices: Array<{
      from: ExternalConnectionNode;
      to: ServiceConnectionNode;
    }>;
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
        if (prev) {
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
    discoveredServices: scriptResponse.discoveredServices
  };
}
