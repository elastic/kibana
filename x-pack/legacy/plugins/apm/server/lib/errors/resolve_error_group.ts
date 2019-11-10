/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';

export const resolveErrorGroup = ({
  groupId,
  serviceName,
  setup
}: {
  groupId: string;
  serviceName: string;
  setup: Setup;
}) => {
  const { indices, client } = setup;

  return client.index({
    index: indices.uiState,
    refresh: true,
    body: {
      ui: {
        error: {
          resolved: {
            timestamp: new Date().getTime()
          }
        }
      },
      error: {
        grouping_key: groupId
      },
      service: {
        name: serviceName
      }
    }
  });
};
