/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const GEO_GRID_TYPE = 'geo_grid';

describe('Processor: GeoGrid', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ httpSetup } = setupEnvironment());
    onUpdate = jest.fn();

    renderProcessorEditor(httpSetup, {
      value: {
        processors: [],
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });

    fireEvent.click(screen.getByTestId('addProcessorButton'));
    fireEvent.change(within(screen.getByTestId('processorTypeSelector')).getByTestId('input'), {
      target: { value: GEO_GRID_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    // Expect form error as "field" is a required parameter
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A tile type value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_geo_grid_processor' },
    });

    // Add "tile tyle" field
    fireEvent.change(screen.getByTestId('tileTypeField'), { target: { value: 'geohex' } });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][GEO_GRID_TYPE]).toEqual(
      expect.objectContaining({
        field: 'test_geo_grid_processor',
        tile_type: 'geohex',
      })
    );
  });

  test('saves with optional parameter values', async () => {
    // Add required fields
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_geo_grid_processor' },
    });
    fireEvent.change(screen.getByTestId('tileTypeField'), { target: { value: 'geohex' } });

    // Add optional fields
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'test_target' },
    });
    fireEvent.change(screen.getByTestId('targetFormatField'), { target: { value: 'WKT' } });
    fireEvent.change(within(screen.getByTestId('parentField')).getByTestId('input'), {
      target: { value: 'parent_field' },
    });
    fireEvent.change(within(screen.getByTestId('childrenField')).getByTestId('input'), {
      target: { value: 'children_field' },
    });
    fireEvent.change(within(screen.getByTestId('nonChildrenField')).getByTestId('input'), {
      target: { value: 'nonchildren_field' },
    });
    fireEvent.change(within(screen.getByTestId('precisionField')).getByTestId('input'), {
      target: { value: 'precision_field' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][GEO_GRID_TYPE]).toEqual({
      field: 'test_geo_grid_processor',
      tile_type: 'geohex',
      target_field: 'test_target',
      target_format: 'WKT',
      parent_field: 'parent_field',
      children_field: 'children_field',
      non_children_field: 'nonchildren_field',
      precision_field: 'precision_field',
    });
  });
});
