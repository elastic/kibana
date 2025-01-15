/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { FieldCopyAction } from '../../../common/types';
import { csvToIngestPipeline } from '../../lib';
import { RouteDependencies } from '../../types';

const bodySchema = schema.object({
  file: schema.string(),
  copyAction: schema.string() as Type<FieldCopyAction>,
});

type ReqBody = TypeOf<typeof bodySchema>;

export const registerParseCsvRoute = ({ router }: RouteDependencies): void => {
  router.post<void, void, ReqBody>(
    {
      path: `${API_BASE_PATH}/parse_csv`,
      validate: {
        body: bodySchema,
      },
    },
    async (contxt, req, res) => {
      const { file, copyAction } = req.body;
      try {
        const result = csvToIngestPipeline(file, copyAction);
        return res.ok({ body: result });
      } catch (error) {
        return res.badRequest({ body: error.message });
      }
    }
  );
};
