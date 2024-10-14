/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTableFieldDataColumnType } from '@elastic/eui';

import { CodeDanger, CodeSuccess } from '../../../../../../styles';
import {
  AllowedValue,
  IncompatibleFieldMetadata,
  UnallowedValueCount,
} from '../../../../../../types';
import {
  DOCUMENT_VALUES_ACTUAL,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../../../../../../translations';
import { EcsAllowedValues } from '../../ecs_allowed_values';
import { IndexInvalidValues } from '../../index_invalid_values';
import { ECS_DESCRIPTION } from '../../translations';

export const getIncompatibleValuesTableColumns = (): Array<
  EuiTableFieldDataColumnType<IncompatibleFieldMetadata>
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

export const getIncompatibleMappingsTableColumns = (): Array<
  EuiTableFieldDataColumnType<IncompatibleFieldMetadata>
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
    name: ECS_MAPPING_TYPE_EXPECTED,
    render: (type: string) => <CodeSuccess data-test-subj="codeSuccess">{type}</CodeSuccess>,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexFieldType',
    name: INDEX_MAPPING_TYPE_ACTUAL,
    render: (indexFieldType: string, x) => (
      <CodeDanger data-test-subj="codeDanger">{indexFieldType}</CodeDanger>
    ),
    sortable: true,
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
