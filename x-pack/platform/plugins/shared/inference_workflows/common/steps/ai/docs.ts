/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_CONNECTOR_FIELD_NOTES = [
  i18n.translate('xpack.inferenceWorkflows.aiSteps.documentation.notes.connectorId', {
    defaultMessage:
      'connector-id is a top-level kebab-case field (alongside name and type), not nested under with and not connectorId. When omitted, it defaults to the workflow default connector.',
  }),
  i18n.translate('xpack.inferenceWorkflows.aiSteps.documentation.notes.liquidTopLevel', {
    defaultMessage:
      'Since 9.5, Liquid expressions are evaluated in these top-level fields (for example, connector-id: "{agentId}"). In 9.3–9.4, use a literal value instead.',
    values: { agentId: '{{ consts.agent_id }}' },
  }),
];
