/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {} from 'rxjs/operators';
import { CoreSetup } from 'src/core/server';
import { indices } from '../../../common/indices';

export async function setupIndices(core: CoreSetup) {
  const {
    callWithInternalUser
  } = await core.elasticsearch.adminClient$.toPromise();

  try {
    await callWithInternalUser('indices.get', {
      index: indices.uiState
    });
  } catch (e) {
    if (e.body.error.type === 'index_not_found_exception') {
      await callWithInternalUser('indices.create', {
        index: indices.uiState
      });
    } else {
      throw e;
    }
  }

  await callWithInternalUser('indices.putMapping', {
    index: indices.uiState,
    body: {
      properties: {
        service: {
          properties: {
            name: {
              type: 'keyword'
            }
          }
        },
        error: {
          properties: {
            grouping_key: {
              type: 'keyword'
            }
          }
        },
        '@timestamp': {
          type: 'date'
        },
        ui: {
          properties: {
            error: {
              properties: {
                muted: {
                  type: 'boolean'
                },
                resolved: {
                  properties: {
                    timestamp: {
                      type: 'date'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}
