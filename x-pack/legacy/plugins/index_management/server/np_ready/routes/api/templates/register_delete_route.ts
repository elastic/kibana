/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Router,
  RouterRouteHandler,
  wrapEsError,
} from '../../../../../../server/lib/create_router';
import { Template } from '../../../../common/types';

const handler: RouterRouteHandler = async (req, callWithRequest) => {
  const { names } = req.params;
  const templateNames = names.split(',');
  const response: { templatesDeleted: Array<Template['name']>; errors: any[] } = {
    templatesDeleted: [],
    errors: [],
  };

  await Promise.all(
    templateNames.map(async name => {
      try {
        await callWithRequest('indices.deleteTemplate', { name });
        return response.templatesDeleted.push(name);
      } catch (e) {
        return response.errors.push({
          name,
          error: wrapEsError(e),
        });
      }
    })
  );

  return response;
};

export function registerDeleteRoute(router: Router) {
  router.delete('templates/{names}', handler);
}
