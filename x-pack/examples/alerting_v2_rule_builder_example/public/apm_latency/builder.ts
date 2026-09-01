/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleBuilderDefinition } from '@kbn/alerting-v2-rule-form';
import { APM_LATENCY_BUILDER_TYPE, type ApmLatencyBuilderFields } from '../../common/apm_latency';
import { isApmLatencyFormValid } from './validation';
import { CREATE_OPTION_DESCRIPTION, CREATE_OPTION_TITLE, STEP_TITLE } from './translations';

/**
 * Kept out of this module so the form components stay out of the page-load
 * bundle: registration happens during `setup()`, long before any rule UI opens.
 */
const ApmLatencyStep = React.lazy(async () => {
  const { ApmLatencyStep: Component } = await import('./apm_latency_step');
  return { default: Component };
});

/**
 * Browser half of the builder: the create-options card, the fields, and how form
 * state maps to `metadata.builder_fields`.
 *
 * The form state here *is* the stored shape, so no `toFields`/`fromFields`
 * adapters are needed — a builder only implements those when its form carries
 * view-only concerns such as React list keys.
 */
export const apmLatencyRuleBuilder: RuleBuilderDefinition<ApmLatencyBuilderFields> = {
  type: APM_LATENCY_BUILDER_TYPE,
  createOption: {
    title: CREATE_OPTION_TITLE,
    description: CREATE_OPTION_DESCRIPTION,
    iconType: 'apmTrace',
    order: 20,
  },
  stepTitle: STEP_TITLE,
  createDefaultState: () => ({
    serviceName: '',
    transactionType: 'request',
    percentile: 95,
    thresholdMs: 1000,
    groupByTransactionName: false,
  }),
  renderStep: (props) =>
    React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(ApmLatencyStep, props)
    ),
  validate: (_state, builderState) => (builderState ? isApmLatencyFormValid(builderState) : false),
};
