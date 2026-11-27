/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import type { MappingProps } from './mapping';
import { Mapping } from './mapping';
import { mappings } from './__mock__';
import { ConnectorTypes } from '../../../common/types/domain';

describe('Mapping', () => {
  const props: MappingProps = {
    actionTypeName: 'ServiceNow ITSM',
    connectorType: ConnectorTypes.serviceNowITSM,
    isLoading: false,
    mappings,
  };

  test('it shows mapping form group', () => {
    renderWithTestingProviders(<Mapping {...props} />);
    expect(screen.getAllByTestId('static-mappings').length).toBeGreaterThan(0);
  });

  test('correctly maps fields', () => {
    renderWithTestingProviders(<Mapping {...props} />);
    expect(
      within(screen.getAllByTestId('field-mapping-source')[0]).getByText('title')
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByTestId('field-mapping-target')[0]).getByText('short_description')
    ).toBeInTheDocument();
  });

  test('displays the title correctly', () => {
    renderWithTestingProviders(<Mapping {...props} />);
    expect(
      within(screen.getByTestId('field-mapping-text')).getByRole('heading', { level: 4 })
    ).toHaveTextContent('ServiceNow ITSM field mappings');
  });

  test('displays the description correctly', () => {
    renderWithTestingProviders(<Mapping {...props} />);
    expect(screen.getByTestId('field-mapping-desc')).toHaveTextContent(
      'Map Case fields to ServiceNow ITSM fields when pushing data to ServiceNow ITSM. Field mappings require an established connection to ServiceNow ITSM.'
    );
  });

  test('displays connection warning when isLoading: false and mappings: []', () => {
    renderWithTestingProviders(<Mapping {...{ ...props, mappings: [] }} />);
    expect(screen.getByTestId('field-mapping-desc')).toHaveTextContent(
      'Failed to retrieve mappings for ServiceNow ITSM.'
    );
  });
});
