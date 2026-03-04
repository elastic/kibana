/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartTypeRegistry } from './chart_type_registry';

export const getChartTypeSelectionPromptContent = () =>
  [
    'Available chart types:',
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { guidance }]) => `- ${chartType}: ${guidance.description}`
    ),
    '',
    'Guidelines:',
    ...Object.entries(chartTypeRegistry).map(([, { guidance }]) => `- ${guidance.guideline}`),
    "- Consider the user's intent and the nature of the data being visualized",
  ].join('\n');
