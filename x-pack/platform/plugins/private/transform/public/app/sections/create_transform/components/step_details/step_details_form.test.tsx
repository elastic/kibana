/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/public';

import { useAppDependencies } from '../../../../app_dependencies';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { getDefaultStepDefineState } from '../step_define/common';

import type { StepDetailsExposedState } from './common';
import { StepDetailsForm } from './step_details_form';

jest.mock('../../../../app_dependencies');

jest.mock('../../../../hooks', () => ({
  useDocumentationLinks: () => ({}),
  useGetDataViewTitles: () => ({ error: null, data: [] }),
  useGetEsIndices: () => ({ error: null, data: [] }),
  useGetEsIngestPipelines: () => ({ error: null, data: [] }),
  useGetTransforms: () => ({ error: null, data: { transformIds: [] } }),
  useGetTransformsPreview: () => ({ error: null, data: undefined }),
}));

const searchItems = {
  dataView: {
    fields: [{ name: 'order_date', type: 'date' }],
    getIndexPattern: () => 'ecommerce',
  },
} as unknown as SearchItems & { dataView: DataView };

const renderForm = () => {
  const onChange = jest.fn<void, [StepDetailsExposedState]>();
  renderWithI18n(
    <StepDetailsForm
      onChange={onChange}
      searchItems={searchItems}
      stepDefineState={getDefaultStepDefineState(searchItems)}
    />
  );
  const lastState = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];
  return { lastState };
};

const fillField = (testSubj: string, value: string) =>
  fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

describe('Transform: <StepDetailsForm />', () => {
  beforeAll(() => {
    Object.assign(useAppDependencies().application.capabilities, {
      indexPatterns: { save: true },
    });
  });

  it('starts empty with the destination index following the transform ID', () => {
    const { lastState } = renderForm();

    expect(screen.getByTestId('transformIdInput')).toHaveValue('');
    expect(screen.getByTestId('transformDescriptionInput')).toHaveValue('');
    expect(screen.getByTestId('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch')).toBeChecked();
    expect(screen.getByTestId('mlCreateDataViewSwitch')).toBeChecked();
    expect(screen.getByTestId('transformContinuousModeSwitch')).not.toBeChecked();

    fillField('transformIdInput', 'my-transform');

    expect(lastState()).toEqual(
      expect.objectContaining({ destinationIndex: 'my-transform', valid: true })
    );
  });

  it.each([
    ['-1', -1],
    ['0', 0],
    ['100', 100],
  ])('accepts %s failure retries', (value, expected) => {
    const { lastState } = renderForm();
    fillField('transformIdInput', 'my-transform');

    fillField('transformNumFailureRetriesInput', value);

    expect(screen.getByTestId('transformNumFailureRetriesInput')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(lastState()).toEqual(
      expect.objectContaining({ transformSettingsNumFailureRetries: expected, valid: true })
    );
  });

  it('flags out-of-range failure retries as invalid', () => {
    renderForm();
    fillField('transformIdInput', 'my-transform');

    fillField('transformNumFailureRetriesInput', '101');

    expect(screen.getByTestId('transformNumFailureRetriesInput')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
