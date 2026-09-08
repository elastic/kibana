/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from './preview_panel';
import { useProfileFormContext } from '../../profile_form_context';
import { usePreviewPanelState } from '../../hooks/use_preview_panel_state';
import { useResolveAnonymizedValues } from '../../../common/hooks/use_resolve_anonymized_values';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
} from '../../hooks/field_rule_actions';
import { buildProfileFormContextValue } from '../../test_fixtures/profile_form_context_value';

jest.mock('../../profile_form_context', () => ({
  useProfileFormContext: jest.fn(),
}));

jest.mock('../../hooks/use_preview_panel_state', () => ({
  usePreviewPanelState: jest.fn(),
}));

jest.mock('../../../common/hooks/use_resolve_anonymized_values', () => ({
  useResolveAnonymizedValues: jest.fn(),
}));

const setContext = (overrides = {}) =>
  jest.mocked(useProfileFormContext).mockReturnValue(
    buildProfileFormContextValue({
      targetId: 'logs-*',
      ...overrides,
    })
  );

const createBasePreviewState = () => ({
  previewInput: '{"host":{"name":"web-1"}}',
  setPreviewInput: jest.fn(),
  previewViewMode: 'table' as const,
  setPreviewViewMode: jest.fn(),
  previewValueMode: 'original' as const,
  setPreviewValueMode: jest.fn(),
  parsedPreviewDocument: { host: { name: 'web-1' } },
  previewRows: [
    {
      field: 'host.name',
      action: FIELD_RULE_ACTION_ALLOW,
      originalValue: 'web-1',
      anonymizedValue: 'web-1',
    },
  ],
  transformedPreviewDocument: { host: { name: 'web-1' } },
  isLoadingPreviewDocument: false,
  previewDocumentLoadError: undefined,
  previewDocumentSource: 'fallback' as const,
  isControlsDisabled: false,
  isInvalidPreviewJson: false,
  isEmptyPreviewRows: false,
});

const setResolverState = (overrides = {}) => {
  jest.mocked(useResolveAnonymizedValues).mockReturnValue({
    resolveText: (value: string) => value,
    tokenToOriginalMap: {},
    isLoading: false,
    error: undefined,
    ...overrides,
  });
};

const setPreviewState = (overrides = {}) => {
  jest.mocked(usePreviewPanelState).mockReturnValue({
    ...createBasePreviewState(),
    ...overrides,
  });
};

describe('PreviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setContext();
    setPreviewState();
    setResolverState();
  });

  it('renders preview title', () => {
    render(<PreviewPanel />);

    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
  });

  it('shows target-loaded callout when sample JSON comes from target', () => {
    setPreviewState({ previewDocumentSource: 'target' });
    const { container } = render(<PreviewPanel />);

    expect(
      container.querySelector(
        '[data-test-subj="anonymizationProfilesPreviewInputLoadedFromTarget"]'
      )
    ).toBeTruthy();
  });

  it('shows fallback warning callout when preview loading fails', () => {
    setPreviewState({ previewDocumentLoadError: 'Unable to load sample JSON' });
    render(<PreviewPanel />);

    expect(screen.getByText('Unable to load sample JSON')).toBeInTheDocument();
  });

  it('shows empty rows message when preview rows are empty', () => {
    setPreviewState({ isEmptyPreviewRows: true, previewRows: [] });
    render(<PreviewPanel />);

    expect(screen.getByText('No preview rows to show.')).toBeInTheDocument();
  });

  it('shows invalid JSON warning when preview JSON cannot be parsed', () => {
    setPreviewState({
      isInvalidPreviewJson: true,
      parsedPreviewDocument: undefined,
      previewRows: [],
    });
    render(<PreviewPanel />);

    expect(screen.getByText('Preview JSON is invalid.')).toBeInTheDocument();
  });

  it('renders JSON output when view mode is json', () => {
    setPreviewState({ previewViewMode: 'json' });
    const { container } = render(<PreviewPanel />);

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesPreviewJsonOutput"]')
    ).toBeTruthy();
  });

  it('renders denied access indicator for deny action rows', () => {
    setPreviewState({
      previewRows: [
        {
          field: 'user.email',
          action: FIELD_RULE_ACTION_DENY,
          originalValue: 'user@example.com',
          anonymizedValue: '[DENIED]',
        },
      ],
    });
    const { container } = render(<PreviewPanel />);

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesPreviewDeniedIcon"]')
    ).toBeTruthy();
  });

  it('renders mask token badge for anonymized values in token mode', () => {
    setPreviewState({
      previewValueMode: 'tokens',
      previewRows: [
        {
          field: 'user.email',
          action: FIELD_RULE_ACTION_ANONYMIZE,
          originalValue: 'user@example.com',
          anonymizedValue: '<EMAIL>',
        },
      ],
    });
    const { container } = render(<PreviewPanel />);

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesPreviewMaskToken"]')
    ).toBeTruthy();
  });

  it('uses resolved text for original-value mode when tokenized values are present', () => {
    setResolverState({
      resolveText: (value: string) => value.replace('EMAIL_1', 'resolved@example.com'),
    });
    setPreviewState({
      previewValueMode: 'original',
      previewRows: [
        {
          field: 'user.email',
          action: FIELD_RULE_ACTION_ALLOW,
          originalValue: 'EMAIL_1',
          anonymizedValue: 'EMAIL_1',
        },
      ],
    });
    render(<PreviewPanel />);

    expect(screen.getByText('resolved@example.com')).toBeInTheDocument();
  });
});
