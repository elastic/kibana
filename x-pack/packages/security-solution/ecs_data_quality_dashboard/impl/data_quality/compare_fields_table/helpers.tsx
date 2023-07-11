/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import { EcsAllowedValues } from './ecs_allowed_values';
import { IndexInvalidValues } from './index_invalid_values';
import { CodeSuccess } from '../styles';
import * as i18n from './translations';
import type { AllowedValue, EnrichedFieldMetadata, UnallowedValueCount } from '../types';

export const EMPTY_PLACEHOLDER = '--';

export const getCustomTableColumns = (): Array<
  EuiTableFieldDataColumnType<EnrichedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '50%',
  },
  {
    field: 'indexFieldType',
    name: i18n.INDEX_MAPPING_TYPE,
    render: (indexFieldType: string) => (
      <EuiCode data-test-subj="indexFieldType">{indexFieldType}</EuiCode>
    ),
    sortable: true,
    truncateText: false,
    width: '50%',
  },
];

export const getEcsCompliantTableColumns = (): Array<
  EuiTableFieldDataColumnType<EnrichedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'type',
    name: i18n.ECS_MAPPING_TYPE,
    render: (type: string | undefined) =>
      type != null ? (
        <CodeSuccess data-test-subj="type">{type}</CodeSuccess>
      ) : (
        <EuiCode data-test-subj="typePlaceholder">{EMPTY_PLACEHOLDER}</EuiCode>
      ),
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'allowed_values',
    name: i18n.ECS_VALUES,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: i18n.ECS_DESCRIPTION,
    render: (description: string | undefined) =>
      description != null ? (
        <span data-test-subj="description">{description}</span>
      ) : (
        <EuiCode data-test-subj="emptyPlaceholder">{EMPTY_PLACEHOLDER}</EuiCode>
      ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
];

export const getIncompatibleValuesTableColumns = (): Array<
  EuiTableFieldDataColumnType<EnrichedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'allowed_values',
    name: i18n.ECS_VALUES_EXPECTED,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexInvalidValues',
    name: i18n.DOCUMENT_VALUES_ACTUAL,
    render: (indexInvalidValues: UnallowedValueCount[]) => (
      <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: i18n.ECS_DESCRIPTION,
    sortable: false,
    truncateText: false,
    width: '25%',
  },
];
