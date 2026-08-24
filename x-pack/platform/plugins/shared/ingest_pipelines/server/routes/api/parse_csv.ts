/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';

import { API_BASE_PATH, APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../../common/constants';
import { FieldCopyAction } from '../../../common/types';
import { csvToIngestPipeline } from '../../lib';
import { RouteDependencies } from '../../types';

// This route parses a CSV that *describes* field mappings for a pipeline (not a data file), so
// even a very large mapping only amounts to a few MB. Cap the body well below the global
// `server.maxPayload`-vs-file-upload ceilings: authorization here is a manual ES privilege
// check inside the handler (`authz.enabled: false`), which runs only after the body has been
// buffered and parsed. A tight limit prevents an authenticated-but-unprivileged caller from
// forcing large allocations before that check runs, while staying generous for any real CSV.
export const parseCsvMaxFileBytes = 10 * 1024 * 1024; // 10MB

export const parseCsvBodySchema = schema.object({
  file: schema.string({ maxLength: parseCsvMaxFileBytes }),
  copyAction: schema.string({ maxLength: 64 }) as Type<FieldCopyAction>,
});

type ReqBody = TypeOf<typeof parseCsvBodySchema>;

export const registerParseCsvRoute = ({ router }: RouteDependencies): void => {
  router.post<void, void, ReqBody>(
    {
      path: `${API_BASE_PATH}/parse_csv`,
      security: {
        authz: {
          enabled: false,
          reason: 'Manually implements ES priv check to match mgmt app',
        },
      },
      options: {
        body: {
          maxBytes: parseCsvMaxFileBytes,
        },
      },
      validate: {
        body: parseCsvBodySchema,
      },
    },
    async (contxt, req, res) => {
      const { file, copyAction } = req.body;
      const privResult = await (
        await contxt.core
      ).elasticsearch.client.asCurrentUser.security.hasPrivileges({
        // same as privs for ingest pipelines management
        cluster: APP_CLUSTER_REQUIRED_PRIVILEGES,
      });
      if (!privResult.has_all_requested) {
        return res.unauthorized();
      }
      try {
        const result = csvToIngestPipeline(file, copyAction);
        return res.ok({ body: result });
      } catch (error) {
        return res.badRequest({ body: error.message });
      }
    }
  );
};
