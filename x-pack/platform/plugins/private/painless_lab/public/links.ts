/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';

export type Links = ReturnType<typeof getLinks>;

export const getLinks = ({ links }: DocLinksStart) =>
  Object.freeze({
    painlessExecuteAPI: links.apis.painlessExecute,
    painlessExecuteAPIContexts: links.apis.painlessExecuteAPIContexts,
    painlessAPIReference: links.scriptedFields.painlessApi,
    painlessWalkthrough: links.scriptedFields.painlessWalkthrough,
    painlessLangSpec: links.scriptedFields.painlessLangSpec,
    esQueryDSL: links.query.queryDsl,
    modulesScriptingPreferParams: links.elasticsearch.scriptParameters,
  });
