/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';
import { Template, TemplateEs } from '../../../../common/types';
import { serializeTemplate } from '../../../../common/lib';

const handler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const { include_type_name } = req.query as any;
  const template = req.payload as Template;
  const serializedTemplate = serializeTemplate(template) as TemplateEs;

  const { order, index_patterns, version, settings, mappings, aliases } = serializedTemplate;

  // Verify the template exists (ES will throw 404 if not)
  await callWithRequest('indices.existsTemplate', { name });

  // Next, update index template
  return await callWithRequest('indices.putTemplate', {
    name,
    order,
    include_type_name,
    body: {
      index_patterns,
      version,
      settings,
      mappings,
      aliases,
    },
  });
};

export function registerUpdateRoute(router: Router) {
  router.put('templates/{name}', handler);
}
