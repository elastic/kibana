/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROJECT_ROUTING } from '@kbn/cps-utils';
import {
  getRetentionPolicyHelpText,
  shouldSuppressPreviewErrorToast,
} from './edit_transform_retention_policy';

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

describe('shouldSuppressPreviewErrorToast', () => {
  const sourceIndexUnavailableError = {
    body: {
      message:
        'Bad Request: [[status_exception] Source indices have been deleted or closed.]: Source indices have been deleted or closed.',
    },
  };

  it('suppresses the toast when a linked source is excluded by the project scope', () => {
    expect(
      shouldSuppressPreviewErrorToast({
        error: sourceIndexUnavailableError,
        originProjectId: 'origin-id',
        projectRouting: '_id:linked-id',
      })
    ).toBe(true);
  });

  it('does not suppress the toast when a local source is missing with origin ID routing', () => {
    expect(
      shouldSuppressPreviewErrorToast({
        error: sourceIndexUnavailableError,
        originProjectId: 'origin-id',
        projectRouting: '_id:origin-id',
      })
    ).toBe(false);
  });

  it('does not suppress source unavailable errors for all projects or literal origin routing', () => {
    expect(
      shouldSuppressPreviewErrorToast({
        error: sourceIndexUnavailableError,
        originProjectId: 'origin-id',
        projectRouting: PROJECT_ROUTING.ALL,
      })
    ).toBe(false);
    expect(
      shouldSuppressPreviewErrorToast({
        error: sourceIndexUnavailableError,
        originProjectId: 'origin-id',
        projectRouting: PROJECT_ROUTING.ORIGIN,
      })
    ).toBe(false);
  });

  it('does not suppress the toast when the origin project cannot be resolved', () => {
    expect(
      shouldSuppressPreviewErrorToast({
        error: sourceIndexUnavailableError,
        projectRouting: '_id:linked-id',
      })
    ).toBe(false);
  });

  it('does not suppress unrelated preview errors', () => {
    expect(
      shouldSuppressPreviewErrorToast({
        error: { body: { message: 'Bad Request: some other transform preview error' } },
        originProjectId: 'origin-id',
        projectRouting: '_id:origin-id',
      })
    ).toBe(false);
  });
});
