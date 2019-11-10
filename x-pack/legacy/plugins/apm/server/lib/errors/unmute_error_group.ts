/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';

export const unmuteErrorGroup = ({
  groupId,
  serviceName,
  setup
}: {
  groupId: string;
  serviceName: string;
  setup: Setup;
}) => {
  const { indices, client } = setup;

  return client.deleteByQuery({
    index: indices.uiState,
    refresh: true,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'ui.error.muted': true
              }
            },
            {
              term: {
                [ERROR_GROUP_ID]: groupId
              }
            },
            {
              term: {
                [SERVICE_NAME]: serviceName
              }
            }
          ]
        }
      }
    }
  });
};
