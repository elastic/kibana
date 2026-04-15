/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { RulePreviewPanel } from './rule_preview_panel';
import * as useRulePreviewModule from '../hooks/use_rule_preview';
import type { RulePreviewResult } from '../hooks/use_rule_preview';

jest.mock('../hooks/use_rule_preview');
jest.mock('./rule_preview_chart', () => ({
  PreviewChart: () => <div data-test-subj="previewChart">Chart Preview Mock</div>,
}));
jest.mock('./recovery_results_preview', () => ({
  RecoveryResultsPreview: () => (
    <div data-test-subj="recoveryResultsPreview">Recovery Preview Mock</div>
  ),
}));
const mockUseRulePreview = jest.mocked(useRulePreviewModule.useRulePreview);

const mockPreviewResult: RulePreviewResult = {
  columns: [
    { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
    { id: 'message', displayAsText: 'message', esType: 'keyword' },
  ],
  rows: [{ '@timestamp': '2024-01-01T00:00:00Z', message: 'Error occurred' }],
  totalRowCount: 1,
  isLoading: false,
  isError: false,
  error: null,
  groupingFields: [],
  uniqueGroupCount: null,
  hasValidQuery: true,
  query: 'FROM logs-*',
  timeField: '@timestamp',
  lookback: '1m',
  refetch: jest.fn(),
};

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-*',
    },
  },
};

describe('RulePreviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRulePreview.mockReturnValue(mockPreviewResult);
  });

  describe('page layout', () => {
    it('renders the preview inline', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(defaultFormValues, undefined, { layout: 'page' }),
      });

      expect(screen.getByTestId('ruleSummaryPreviewPanel')).toBeInTheDocument();
      expect(
        screen.getByText('Updates as you edit the Rule configuration section.')
      ).toBeInTheDocument();
      expect(screen.getByText('Rule Summary')).toBeInTheDocument();
      expect(screen.getByTestId('ruleSummaryDetailsGrid')).toBeInTheDocument();
      expect(screen.getByText('Data source')).toBeInTheDocument();
      expect(screen.queryByTestId('ruleSummaryEsqlQueryShell')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ruleSummaryBuilderEsqlCodeBlock')).not.toBeInTheDocument();
      expect(screen.getByText('Rule results preview')).toBeInTheDocument();
      expect(screen.getByTestId('ruleResultsPreviewGrid')).toBeInTheDocument();
      expect(screen.queryByTestId('rulePreviewTriggerButton')).not.toBeInTheDocument();
    });

    it('renders ES|QL code block summary for the Threshold Alert builder', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          {
            ...defaultFormValues,
            evaluation: { query: { base: 'FROM metrics-*\n| STATS COUNT(*) AS c' } },
          },
          undefined,
          { layout: 'page', ruleBuilderId: 'threshold_alert', includeQueryEditor: false }
        ),
      });

      expect(screen.getByTestId('ruleSummaryBuilderEsqlCodeBlock')).toBeInTheDocument();
      expect(screen.getByText('ES|QL query')).toBeInTheDocument();
      expect(screen.getByTestId('ruleSummaryBuilderEsqlCodeBlock')).toHaveTextContent(
        'FROM metrics-*'
      );
    });

    it('renders Open in Discover when getDiscoverHrefForEsql returns a URL', () => {
      const discoverUrl = 'https://test/discover';
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          {
            ...defaultFormValues,
            evaluation: { query: { base: 'FROM logs-*\n| LIMIT 10' } },
          },
          {
            ...createMockServices(),
            getDiscoverHrefForEsql: () => discoverUrl,
          },
          { layout: 'page', ruleBuilderId: 'threshold_alert', includeQueryEditor: false }
        ),
      });

      const link = screen.getByTestId('ruleSummaryOpenInDiscoverButton');
      expect(link).toHaveAttribute('href', discoverUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render Open in Discover when getDiscoverHrefForEsql is omitted', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          {
            ...defaultFormValues,
            evaluation: { query: { base: 'FROM logs-*' } },
          },
          createMockServices(),
          { layout: 'page', ruleBuilderId: 'threshold_alert', includeQueryEditor: false }
        ),
      });

      expect(screen.queryByTestId('ruleSummaryOpenInDiscoverButton')).not.toBeInTheDocument();
    });

    it('does not render recovery preview when recovery type is no_breach', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          { ...defaultFormValues, recoveryPolicy: { type: 'no_breach' } },
          undefined,
          { layout: 'page' }
        ),
      });

      expect(screen.queryByTestId('recoveryResultsPreview')).not.toBeInTheDocument();
    });

    it('renders recovery preview when recovery type is query', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          { ...defaultFormValues, recoveryPolicy: { type: 'query' } },
          undefined,
          { layout: 'page' }
        ),
      });

      expect(screen.getByText('Rule results preview')).toBeInTheDocument();
      expect(screen.getByTestId('recoveryResultsPreview')).toBeInTheDocument();
      expect(screen.getByText('Recovery Preview Mock')).toBeInTheDocument();
    });
  });

  describe('flyout layout', () => {
    it('renders a trigger button instead of the preview', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(defaultFormValues, undefined, { layout: 'flyout' }),
      });

      expect(screen.getByTestId('rulePreviewTriggerButton')).toBeInTheDocument();
      expect(screen.getByText('Preview results')).toBeInTheDocument();
      expect(screen.queryByTestId('ruleResultsPreviewGrid')).not.toBeInTheDocument();
    });

    it('opens a nested flyout when the trigger button is clicked', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(defaultFormValues, undefined, { layout: 'flyout' }),
      });

      fireEvent.click(screen.getByTestId('rulePreviewTriggerButton'));

      expect(screen.getByTestId('rulePreviewNestedFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('ruleResultsPreviewGrid')).toBeInTheDocument();
    });

    it('closes the nested flyout when the close button is clicked', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(defaultFormValues, undefined, { layout: 'flyout' }),
      });

      fireEvent.click(screen.getByTestId('rulePreviewTriggerButton'));
      expect(screen.getByTestId('rulePreviewNestedFlyout')).toBeInTheDocument();

      // Close the flyout via the EuiFlyout close button
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByTestId('rulePreviewNestedFlyout')).not.toBeInTheDocument();
    });

    it('does not render recovery preview in flyout when recovery type is no_breach', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          { ...defaultFormValues, recoveryPolicy: { type: 'no_breach' } },
          undefined,
          { layout: 'flyout' }
        ),
      });

      fireEvent.click(screen.getByTestId('rulePreviewTriggerButton'));

      expect(screen.getByTestId('rulePreviewNestedFlyout')).toBeInTheDocument();
      expect(screen.queryByTestId('recoveryResultsPreview')).not.toBeInTheDocument();
    });

    it('renders recovery preview in flyout when recovery type is query', () => {
      render(<RulePreviewPanel />, {
        wrapper: createFormWrapper(
          { ...defaultFormValues, recoveryPolicy: { type: 'query' } },
          undefined,
          { layout: 'flyout' }
        ),
      });

      fireEvent.click(screen.getByTestId('rulePreviewTriggerButton'));

      expect(screen.getByTestId('rulePreviewNestedFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('recoveryResultsPreview')).toBeInTheDocument();
    });
  });
});
