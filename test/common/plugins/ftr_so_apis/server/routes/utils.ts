/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import type { ISavedObjectTypeRegistry, RequestHandlerWrapper } from '@kbn/core/server';

export const listHiddenTypes = (registry: ISavedObjectTypeRegistry): string[] => {
  return registry
    .getAllTypes()
    .map((type) => type.name)
    .filter((typeName) => registry.isHidden(typeName));
};

export const catchAndReturnBoomErrors: RequestHandlerWrapper = (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode !== 500) {
        return response.customError({
          body: e.output.payload,
          statusCode: e.output.statusCode,
          headers: e.output.headers as { [key: string]: string },
        });
      }
      throw e;
    }
  };
};
