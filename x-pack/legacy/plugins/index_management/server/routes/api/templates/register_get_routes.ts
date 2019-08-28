/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeTemplate, deserializeTemplateList } from '../../../../common/lib';
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

const allHandler: RouterRouteHandler = async (_req, callWithRequest) => {
  const indexTemplatesByName = await callWithRequest('indices.getTemplate');

  return deserializeTemplateList(indexTemplatesByName);
};

const oneHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const indexTemplateByName = await callWithRequest('indices.getTemplate', { name });

  if (indexTemplateByName[name]) {
    return deserializeTemplate({ ...indexTemplateByName[name], name });
  }
};

export function registerGetAllRoute(router: Router) {
  router.get('templates', allHandler);
}

export function registerGetOneRoute(router: Router) {
  router.get('templates/{name}', oneHandler);
}
