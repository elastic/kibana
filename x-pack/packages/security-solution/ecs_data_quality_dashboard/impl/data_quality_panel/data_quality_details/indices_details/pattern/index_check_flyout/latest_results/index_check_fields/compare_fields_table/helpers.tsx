/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import {
  DOCUMENT_VALUES_ACTUAL,
  ECS_VALUES_EXPECTED,
  FIELD,
} from '../../../../../../../translations';
import { EcsAllowedValues } from './ecs_allowed_values';
import { IndexInvalidValues } from './index_invalid_values';
import { CodeSuccess } from '../../../../../../../styles';
import type {
  AllowedValue,
  CustomFieldMetadata,
  EcsBasedFieldMetadata,
  UnallowedValueCount,
} from '../../../../../../../types';
import { ECS_DESCRIPTION, ECS_MAPPING_TYPE, ECS_VALUES, INDEX_MAPPING_TYPE } from './translations';

export const getCustomTableColumns = (): Array<
  EuiTableFieldDataColumnType<CustomFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '50%',
  },
  {
    field: 'indexFieldType',
    name: INDEX_MAPPING_TYPE,
    render: (indexFieldType: string) => (
      <EuiCode data-test-subj="indexFieldType">{indexFieldType}</EuiCode>
    ),
    sortable: true,
    truncateText: false,
    width: '50%',
  },
];

export const getEcsCompliantTableColumns = (): Array<
  EuiTableFieldDataColumnType<EcsBasedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'type',
    name: ECS_MAPPING_TYPE,
    render: (type: string) => <CodeSuccess data-test-subj="type">{type}</CodeSuccess>,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'allowed_values',
    name: ECS_VALUES,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: ECS_DESCRIPTION,
    render: (description: string) => <span data-test-subj="description">{description}</span>,
    sortable: false,
    truncateText: false,
    width: '35%',
  },
];

export const getIncompatibleValuesTableColumns = (): Array<
  EuiTableFieldDataColumnType<EcsBasedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'allowed_values',
    name: ECS_VALUES_EXPECTED,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexInvalidValues',
    name: DOCUMENT_VALUES_ACTUAL,
    render: (indexInvalidValues: UnallowedValueCount[]) => (
      <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: ECS_DESCRIPTION,
    sortable: false,
    truncateText: false,
    width: '35%',
  },
];
