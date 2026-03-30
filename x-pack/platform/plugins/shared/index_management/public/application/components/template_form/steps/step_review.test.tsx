/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { TemplateDeserialized } from '../../../../../common';
import { StepReview } from './step_review';

const mockSimulateTemplatePropsSpy = jest.fn();
jest.mock('../../index_templates', () => ({
  __esModule: true,
  SimulateTemplate: (props: unknown) => {
    mockSimulateTemplatePropsSpy(props);
    return <div data-test-subj="mockSimulateTemplate" />;
  },
}));

describe('StepReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSimulateTemplatePropsSpy.mockClear();
  });

  const makeTemplate = (overrides: Partial<TemplateDeserialized> = {}): TemplateDeserialized => ({
    name: 'my_template',
    indexPatterns: ['index-*'],
    indexMode: 'standard',
    template: {
      settings: { index: { number_of_shards: 1 } },
      mappings: { properties: { field_1: { type: 'keyword' } } },
      aliases: { my_alias: { is_write_index: true } },
    },
    composedOf: [],
    ignoreMissingComponentTemplates: [],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: false, isLegacy: false },
    ...overrides,
  });

  describe('WHEN reviewing a composable template', () => {
    it('SHOULD render Summary, Preview, and Request tabs', () => {
      render(
        <I18nProvider>
          <StepReview template={makeTemplate()} navigateToStep={jest.fn()} />
        </I18nProvider>
      );

      // EuiTabbedContent renders tab buttons; the preview tab exists for non-legacy.
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Request')).toBeInTheDocument();
    });
  });

  describe('WHEN reviewing a legacy template', () => {
    it('SHOULD not render the Preview tab', () => {
      render(
        <I18nProvider>
          <StepReview
            template={makeTemplate({
              _kbnMeta: { type: 'default', hasDatastream: false, isLegacy: true },
            })}
            navigateToStep={jest.fn()}
          />
        </I18nProvider>
      );

      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.queryByText('Preview')).not.toBeInTheDocument();
      expect(screen.getByText('Request')).toBeInTheDocument();
    });
  });

  describe('WHEN index patterns contain a wildcard', () => {
    it('SHOULD show a warning and wire the edit link', () => {
      const navigateToStep = jest.fn();
      render(
        <I18nProvider>
          <StepReview
            template={makeTemplate({ indexPatterns: ['*'] })}
            navigateToStep={navigateToStep}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('indexPatternsWarning')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Edit index patterns.'));
      expect(navigateToStep).toHaveBeenCalledWith('logistics', expect.any(Object));
    });
  });

  describe('WHEN the Preview tab is clicked', () => {
    it('SHOULD render the SimulateTemplate component', () => {
      render(
        <I18nProvider>
          <StepReview template={makeTemplate()} navigateToStep={jest.fn()} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByText('Preview'));
      expect(screen.getByTestId('mockSimulateTemplate')).toBeInTheDocument();
    });
  });
});
