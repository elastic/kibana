/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { binarySupportedTypesPath } from '@kbn/agent-builder-plugin/common/constants';
import type { BinaryConverters } from '../attachment_types/binary/converters';
import { getAvailableBinaryMimeTypes } from '../attachment_types/binary/converters';

export const registerBinarySupportedTypesRoute = ({
  router,
  binaryConverters,
}: {
  router: IRouter;
  binaryConverters: BinaryConverters;
}) => {
  router.get(
    {
      path: binarySupportedTypesPath,
      validate: false,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    async (_context, _request, response) =>
      response.ok({ body: { mime_types: getAvailableBinaryMimeTypes(binaryConverters) } })
  );
};
