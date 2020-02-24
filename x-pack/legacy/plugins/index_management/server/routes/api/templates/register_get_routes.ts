/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeTemplate, deserializeTemplateList } from '../../../../common/lib';
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';
import { getManagedTemplatePrefix } from '../../../lib/get_managed_templates';

let callWithInternalUser: any;

const allHandler: RouterRouteHandler = async (_req, callWithRequest) => {
  const managedTemplatePrefix = await getManagedTemplatePrefix(callWithInternalUser);

  const indexTemplatesByName = await callWithRequest('indices.getTemplate', {
    include_type_name: true,
  });

  return deserializeTemplateList(indexTemplatesByName, managedTemplatePrefix);
};

const oneHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const managedTemplatePrefix = await getManagedTemplatePrefix(callWithInternalUser);
  const indexTemplateByName = await callWithRequest('indices.getTemplate', {
    name,
    include_type_name: true,
  });

  if (indexTemplateByName[name]) {
    return deserializeTemplate({ ...indexTemplateByName[name], name }, managedTemplatePrefix);
  }
};

export function registerGetAllRoute(router: Router, server: any) {
  callWithInternalUser = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  router.get('templates', allHandler);
}

export function registerGetOneRoute(router: Router, server: any) {
  callWithInternalUser = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  router.get('templates/{name}', oneHandler);
}
