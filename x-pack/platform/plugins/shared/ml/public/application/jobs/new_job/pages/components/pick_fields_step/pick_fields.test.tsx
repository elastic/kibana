/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { FC } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { MLFieldStatsFlyoutContext } from '@kbn/ml-field-stats-flyout';
import type { JobCreatorContextValue } from '../job_creator_context';
import { JobCreatorContext } from '../job_creator_context';
import { PickFieldsStep } from './pick_fields';

vi.mock('../wizard_nav', () => {
      const mocked = { WizardNav: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('../common/json_editor_flyout', () => {
      const mocked = {
      JsonEditorFlyout: () => null,
      EDITOR_MODE: { EDITABLE: 'editable' },
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/single_metric_view', () => {
      const mocked = { SingleMetricView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/multi_metric_view', () => {
      const mocked = { MultiMetricView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/population_view', () => {
      const mocked = { PopulationView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/advanced_view', () => {
      const mocked = { AdvancedView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/categorization_view', () => {
      const mocked = { CategorizationView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/rare_view', () => {
      const mocked = { RareView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/geo_view', () => {
      const mocked = { GeoView: () => null };
      return { ...mocked, default: mocked };
    });

describe('PickFieldsStep', () => {
  const setIsFlyoutVisible = vi.fn();
  const setFieldName = vi.fn();

  const fieldStatsContext = {
    isFlyoutVisible: true,
    setIsFlyoutVisible,
    setFieldName,
    toggleFlyoutVisible: vi.fn(),
    setFieldValue: vi.fn(),
  };

  const Wrapper: FC<{ jobValidatorUpdated: number }> = ({ jobValidatorUpdated }) => (
    <MLFieldStatsFlyoutContext.Provider value={fieldStatsContext}>
      <JobCreatorContext.Provider
        value={
          {
            jobValidatorUpdated,
            jobValidator: { isPickFieldsStepValid: true },
          } as JobCreatorContextValue
        }
      >
        <PickFieldsStep isCurrentStep={false} setCurrentStep={vi.fn()} />
      </JobCreatorContext.Provider>
    </MLFieldStatsFlyoutContext.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leaves the field stats flyout open when the job validator emits a new result', () => {
    const { rerender } = render(<Wrapper jobValidatorUpdated={0} />);

    rerender(<Wrapper jobValidatorUpdated={1} />);

    expect(setIsFlyoutVisible).not.toHaveBeenCalled();
    expect(setFieldName).not.toHaveBeenCalled();
  });

  it('closes the field stats flyout when the step unmounts', () => {
    const { unmount } = render(<Wrapper jobValidatorUpdated={0} />);

    unmount();

    expect(setIsFlyoutVisible).toHaveBeenCalledWith(false);
    expect(setFieldName).toHaveBeenCalledWith(undefined);
  });
});
