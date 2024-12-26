/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTextColor } from '@elastic/eui';
import React, { FC } from 'react';
import { FormattedFilterViewInstance } from '../../../../types';
import { Filter } from '../filter.component';

const filter: FormattedFilterViewInstance = {
  type: {
    label: 'Type',
    formattedValue: 'exactly',
  },
  column: {
    label: 'Column',
    formattedValue: 'project',
  },
  value: {
    label: 'Value',
    formattedValue: 'kibana',
  },
  filterGroup: {
    label: 'Filter group',
    formattedValue: 'Group 1',
  },
};

const component: FC<any> = ({ value }) => (
  <EuiText>
    <EuiTextColor color="success">
      <h3>{value}</h3>
    </EuiTextColor>
  </EuiText>
);

export default {
  title: 'components/WorkpadFilters/FilterComponent',
};

export const Default = {
  render: () => <Filter filter={filter} />,
  name: 'default',
};

export const WithComponentField = {
  render: () => <Filter filter={{ ...filter, value: { ...filter.value, component } }} />,

  name: 'with component field',
};

export const WithCustomFilterFields = {
  render: () => (
    <Filter
      filter={{
        ...filter,
        customField: { label: 'Custom Field', formattedValue: 'Some unknown field' },
      }}
    />
  ),

  name: 'with custom filter fields',
};
