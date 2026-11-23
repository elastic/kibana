/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import { capitalize } from 'lodash/fp';

import type { FieldMappingProps } from './field_mapping';
import { FieldMapping } from './field_mapping';
import { mappings } from './__mock__';
import { renderWithTestingProviders } from '../../common/mock';

describe('FieldMappingRow', () => {
  const props: FieldMappingProps = {
    actionTypeName: 'ServiceNow ITSM',
    isLoading: false,
    mappings,
  };

  test('it renders', () => {
    renderWithTestingProviders(<FieldMapping {...props} />);

    expect(screen.getByTestId('case-configure-field-mappings-row-wrapper')).toBeInTheDocument();
    expect(screen.getAllByTestId('static-mappings')).toHaveLength(3);
  });

  test('it does not render without mappings', () => {
    renderWithTestingProviders(<FieldMapping {...props} mappings={[]} />);

    expect(
      screen.queryByTestId('case-configure-field-mappings-row-wrapper')
    ).not.toBeInTheDocument();
  });

  test('it pass the corrects props to mapping row', () => {
    renderWithTestingProviders(<FieldMapping {...props} />);

    const rows = screen.getAllByTestId('static-mappings');
    rows.forEach((row, index) => {
      expect(within(row).getByTestId('field-mapping-source')).toHaveTextContent(
        mappings[index].source
      );
      expect(within(row).getByTestId('field-mapping-target')).toHaveTextContent(
        mappings[index].target ?? 'not_mapped'
      );
      expect(row).toHaveTextContent(capitalize(mappings[index].actionType));
    });
  });

  test('displays the label of the second column correctly', () => {
    renderWithTestingProviders(<FieldMapping {...props} />);

    expect(screen.getByTestId('case-configure-field-mappings-second-col-label')).toHaveTextContent(
      'ServiceNow ITSM field'
    );
  });
});
