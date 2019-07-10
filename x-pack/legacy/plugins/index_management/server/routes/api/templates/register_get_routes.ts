/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

const allHandler: RouterRouteHandler = async (_req, callWithRequest) => {
  const indexTemplatesByName = await callWithRequest('indices.getTemplate');
  const indexTemplateNames = Object.keys(indexTemplatesByName);

  const indexTemplates = indexTemplateNames.map(name => {
    const {
      version,
      order,
      index_patterns: indexPatterns = [],
      settings = {},
      aliases = {},
      mappings = {},
    } = indexTemplatesByName[name];
    return {
      name,
      version,
      order,
      indexPatterns: indexPatterns.sort(),
      settings,
      aliases,
      mappings,
    };
  });

  return indexTemplates;
};

const oneHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const indexTemplateByName = await callWithRequest('indices.getTemplate', { name });

  const {
    version,
    order,
    index_patterns: indexPatterns = [],
    settings = {},
    aliases = {},
    mappings = {},
  } = indexTemplateByName[name];

  return {
    name,
    version,
    order,
    indexPatterns: indexPatterns.sort(),
    settings,
    aliases,
    mappings,
  };
};

export function registerGetAllRoute(router: Router) {
  router.get('templates', allHandler);
}

export function registerGetOneRoute(router: Router) {
  router.get('templates/{name}', oneHandler);
}
