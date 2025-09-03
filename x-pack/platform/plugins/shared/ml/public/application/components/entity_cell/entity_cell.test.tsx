/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { EntityCell } from './entity_cell';

const defaultProps = {
  entityName: 'Test Name',
  entityValue: 'Test Value',
  filter: () => {},
  wrapText: false,
};

describe('EntityCell', () => {
  test('Icons are displayed when filter, entityName, and entityValue are defined', () => {
    renderWithI18n(<EntityCell {...defaultProps} />);

    // Test for the presence of both add and remove filter buttons
    const addFilterButton = screen.getByTestId(
      `mlAnomaliesTableEntityCellAddFilterButton-${defaultProps.entityValue}`
    );
    const removeFilterButton = screen.getByTestId(
      `mlAnomaliesTableEntityCellRemoveFilterButton-${defaultProps.entityValue}`
    );

    expect(addFilterButton).toBeInTheDocument();
    expect(removeFilterButton).toBeInTheDocument();
  });

  test('Icons are not displayed when filter, entityName, or entityValue are undefined', () => {
    const propsUndefinedFilter = { ...defaultProps, filter: undefined };
    renderWithI18n(<EntityCell {...propsUndefinedFilter} />);

    // Test that filter buttons are not present
    const addFilterButton = screen.queryByTestId(
      `mlAnomaliesTableEntityCellAddFilterButton-${defaultProps.entityValue}`
    );
    const removeFilterButton = screen.queryByTestId(
      `mlAnomaliesTableEntityCellRemoveFilterButton-${defaultProps.entityValue}`
    );

    expect(addFilterButton).not.toBeInTheDocument();
    expect(removeFilterButton).not.toBeInTheDocument();
  });
});
