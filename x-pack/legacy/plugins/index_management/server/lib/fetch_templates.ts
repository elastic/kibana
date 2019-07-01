/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const fetchTemplates = async (callWithRequest: any) => {
  const indexTemplatesByName = await callWithRequest('indices.getTemplate');
  const indexTemplateNames = Object.keys(indexTemplatesByName);

  const indexTemplates = indexTemplateNames.map(name => {
    const {
      version,
      order,
      // eslint-disable-next-line @typescript-eslint/camelcase
      index_patterns = [],
      settings = {},
      aliases = {},
      mappings = {},
    } = indexTemplatesByName[name];
    return {
      name,
      version,
      order,
      index_patterns,
      settings,
      aliases,
      mappings,
    };
  });

  return indexTemplates;
};
