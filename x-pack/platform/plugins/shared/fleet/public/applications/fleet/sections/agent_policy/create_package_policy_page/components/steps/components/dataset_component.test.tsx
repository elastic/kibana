/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import { DatasetComponent } from './dataset_component';

describe('DatasetComponent', () => {
  function render(value = 'generic', datastreams: any = []) {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();
    const fieldLabel = 'Dataset name';

    const utils = renderer.render(
      <DatasetComponent
        pkgName={'log'}
        datastreams={datastreams}
        value={{
          dataset: value,
          package: 'log',
        }}
        onChange={mockOnChange}
        isDisabled={false}
        fieldLabel={fieldLabel}
      />
    );

    return { utils, mockOnChange };
  }

  it('should show validation error if dataset is invalid', () => {
    const { utils } = render();

    const inputEl = utils.getByTestId('comboBoxSearchInput');
    fireEvent.change(inputEl, { target: { value: 'generic*' } });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });

    utils.getByText('Dataset contains invalid characters');
  });

  it('should not show validation error if dataset is valid', () => {
    const { utils } = render();

    const inputEl = utils.getByTestId('comboBoxSearchInput');
    fireEvent.change(inputEl, { target: { value: 'test' } });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });

    expect(utils.queryByText('Dataset contains invalid characters')).toBeNull();
  });

  it('should not show validation error if valid dataset selected from select', () => {
    const { utils, mockOnChange } = render(undefined, [
      { dataset: 'fleet_server.test_ds', package: 'log' },
    ]);

    const inputEl = utils.getByTestId('comboBoxSearchInput');
    fireEvent.click(inputEl);
    const option = utils.getByText('fleet_server.test_ds');
    fireEvent.click(option);

    expect(utils.queryByText('Dataset contains invalid characters')).toBeNull();
    expect(mockOnChange).toHaveBeenCalledWith({ dataset: 'fleet_server.test_ds', package: 'log' });
  });
});
