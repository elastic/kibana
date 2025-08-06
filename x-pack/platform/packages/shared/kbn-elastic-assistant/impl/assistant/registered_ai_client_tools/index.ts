/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addToDashboardTool } from '@kbn/ai-client-tools-plugin/public';
import type { Tool } from '@langchain/core/dist/tools';
import { pick } from 'lodash';

export const clientSideTools = [addToDashboardTool];

const getToolDetailsForSecurityAssistant = (tool: Tool) => {
  return pick(tool, ['id', 'name', 'description', 'parameters', 'screenDescription']);
};

export const clientSideToolsForSecurityAssistant = clientSideTools.map(
  getToolDetailsForSecurityAssistant
);
