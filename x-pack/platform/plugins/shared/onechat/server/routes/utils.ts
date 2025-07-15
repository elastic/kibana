/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ToolType } from '@kbn/onechat-common';

export const getTechnicalPreviewWarning = (featureName: string) => {
  return `${featureName} is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.`;
};

export const supportedToolTypes = schema.oneOf([schema.literal(ToolType.esql)]);
