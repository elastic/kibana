/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ATTR_SPAN_TYPE } from '@kbn/opentelemetry-attributes';
import { createWithActiveSpan } from '@kbn/tracing';

export const withAssistantSpan = createWithActiveSpan({
  attributes: {
    'labels.plugin': 'observability_ai_assistant',
    [ATTR_SPAN_TYPE]: 'plugin:observability_ai_assistant',
  },
});
