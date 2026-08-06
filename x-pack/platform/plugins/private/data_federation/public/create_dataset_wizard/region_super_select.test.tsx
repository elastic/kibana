/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor, within } from '@testing-library/react';

import { RegionSuperSelect } from './region_super_select';

describe('RegionSuperSelect', () => {
  const renderSelect = (props: Partial<React.ComponentProps<typeof RegionSuperSelect>> = {}) => {
    const onChange = jest.fn();

    const view = render(
      <EuiProvider>
        <RegionSuperSelect
          onChange={onChange}
          placeholder="Select region"
          searchPlaceholder="Search regions"
          aria-label="Region"
          data-test-subj="datasetWizardRegion"
          {...props}
        />
      </EuiProvider>
    );

    return { ...view, onChange };
  };

  it('filters regions by search query', async () => {
    const { getByTestId, getAllByRole } = renderSelect();

    fireEvent.click(getByTestId('datasetWizardRegion'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardRegionSearch')).toBeInTheDocument();
    });

    fireEvent.change(getByTestId('datasetWizardRegionSearch'), {
      target: { value: 'Ohio' },
    });

    await waitFor(() => {
      expect(getAllByRole('option')).toHaveLength(1);
    });

    expect(within(getAllByRole('option')[0]).getByText('US East (Ohio)')).toBeInTheDocument();
  });

  it('selects a region from the searchable list', async () => {
    const { getByTestId, getAllByRole, onChange } = renderSelect();

    fireEvent.click(getByTestId('datasetWizardRegion'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardRegionSearch')).toBeInTheDocument();
    });

    fireEvent.change(getByTestId('datasetWizardRegionSearch'), {
      target: { value: 'Oregon' },
    });

    await waitFor(() => {
      expect(getAllByRole('option')).toHaveLength(1);
    });

    fireEvent.click(getAllByRole('option')[0]);

    expect(onChange).toHaveBeenCalledWith('us-west-2');
  });
});
