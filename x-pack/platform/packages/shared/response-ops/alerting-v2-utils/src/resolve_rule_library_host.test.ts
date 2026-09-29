/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';
import {
  isObservabilityContext,
  OBSERVABILITY_RULE_LIBRARY_HOST,
  resolveAlertingV2RuleLibraryHost,
} from './resolve_rule_library_host';

describe('isObservabilityContext', () => {
  it('matches solution nav `oblt`', () => {
    expect(isObservabilityContext({ solutionNavId: 'oblt' })).toBe(true);
  });

  it('matches serverless project type `observability`', () => {
    expect(isObservabilityContext({ projectType: 'observability' })).toBe(true);
  });

  it('matches space solution `oblt`', () => {
    expect(isObservabilityContext({ spaceSolution: 'oblt' })).toBe(true);
  });

  it('does not match other solutions', () => {
    expect(isObservabilityContext({ solutionNavId: 'es' })).toBe(false);
    expect(isObservabilityContext({ solutionNavId: 'security' })).toBe(false);
    expect(isObservabilityContext({ projectType: 'search' })).toBe(false);
    expect(isObservabilityContext({ projectType: 'security' })).toBe(false);
    expect(isObservabilityContext({ spaceSolution: 'classic' })).toBe(false);
    expect(isObservabilityContext({})).toBe(false);
    expect(isObservabilityContext({ solutionNavId: null })).toBe(false);
  });
});

describe('resolveAlertingV2RuleLibraryHost', () => {
  it('returns the observability host for observability context', () => {
    expect(resolveAlertingV2RuleLibraryHost({ solutionNavId: 'oblt' })).toEqual(
      OBSERVABILITY_RULE_LIBRARY_HOST
    );
    expect(resolveAlertingV2RuleLibraryHost({ projectType: 'observability' })).toEqual({
      app: OBSERVABILITY_ALERTING_APP_ID,
      pathPrefix: '/rule-library',
    });
  });

  it('returns undefined so locators fall back to management', () => {
    expect(resolveAlertingV2RuleLibraryHost({ solutionNavId: 'security' })).toBeUndefined();
    expect(resolveAlertingV2RuleLibraryHost({ projectType: 'search' })).toBeUndefined();
    expect(resolveAlertingV2RuleLibraryHost({})).toBeUndefined();
  });
});
