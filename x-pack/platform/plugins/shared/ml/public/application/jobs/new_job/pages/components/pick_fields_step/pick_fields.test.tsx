/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { MLFieldStatsFlyoutContext } from '@kbn/ml-field-stats-flyout';
import type { JobCreatorContextValue } from '../job_creator_context';
import { JobCreatorContext } from '../job_creator_context';
import { PickFieldsStep } from './pick_fields';

jest.mock('../wizard_nav', () => ({ WizardNav: () => null }));
jest.mock('../common/json_editor_flyout', () => ({
  JsonEditorFlyout: () => null,
  EDITOR_MODE: { EDITABLE: 'editable' },
}));
jest.mock('./components/single_metric_view', () => ({ SingleMetricView: () => null }));
jest.mock('./components/multi_metric_view', () => ({ MultiMetricView: () => null }));
jest.mock('./components/population_view', () => ({ PopulationView: () => null }));
jest.mock('./components/advanced_view', () => ({ AdvancedView: () => null }));
jest.mock('./components/categorization_view', () => ({ CategorizationView: () => null }));
jest.mock('./components/rare_view', () => ({ RareView: () => null }));
jest.mock('./components/geo_view', () => ({ GeoView: () => null }));

describe('PickFieldsStep', () => {
  const setIsFlyoutVisible = jest.fn();
  const setFieldName = jest.fn();

  const fieldStatsContext = {
    isFlyoutVisible: true,
    setIsFlyoutVisible,
    setFieldName,
    toggleFlyoutVisible: jest.fn(),
    setFieldValue: jest.fn(),
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
        <PickFieldsStep isCurrentStep={false} setCurrentStep={jest.fn()} />
      </JobCreatorContext.Provider>
    </MLFieldStatsFlyoutContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
