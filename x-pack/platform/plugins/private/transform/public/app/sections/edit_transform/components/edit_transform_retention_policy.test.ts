/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRetentionPolicyHelpText } from './edit_transform_retention_policy';

describe('getRetentionPolicyHelpText', () => {
  it('returns empty help text when retention policy is available', () => {
    expect(
      getRetentionPolicyHelpText({
        isRetentionPolicyAvailable: true,
        isSourceIndexUnavailable: false,
      })
    ).toBe('');
  });

  it('returns source unavailable help text when the preview failed for the project scope', () => {
    expect(
      getRetentionPolicyHelpText({
        isRetentionPolicyAvailable: false,
        isSourceIndexUnavailable: true,
      })
    ).toBe(
      'Retention policy settings are unavailable because no source indices match this transform project scope.'
    );
  });

  it('returns no date fields help text when preview succeeds without date fields', () => {
    expect(
      getRetentionPolicyHelpText({
        isRetentionPolicyAvailable: false,
        isSourceIndexUnavailable: false,
      })
    ).toBe('Retention policy settings are not available for indices without date fields.');
  });
});
