/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../../common/constants';
import { buildSiemResponse, transformError } from '../utils';
import { readPrivileges } from '../../privileges/read_privileges';

export const readPrivilegesRoute = (router: IRouter, usingEphemeralEncryptionKey: boolean) => {
  router.get(
    {
      path: DETECTION_ENGINE_PRIVILEGES_URL,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem.getSiemClient();

        const index = siemClient.signalsIndex;
        const clusterPrivileges = await readPrivileges(clusterClient.callAsCurrentUser, index);
        const privileges = merge(clusterPrivileges, {
          is_authenticated: true, // until we support optional auth: https://github.com/elastic/kibana/pull/55327#issuecomment-577159911
          has_encryption_key: !usingEphemeralEncryptionKey,
        });

        return response.ok({ body: privileges });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
