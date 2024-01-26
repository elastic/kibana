/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import { SameFamily } from '../../data_quality_panel/same_family';
import { EcsAllowedValues } from '../ecs_allowed_values';
import { getIsInSameFamily } from '../../helpers';
import { IndexInvalidValues } from '../index_invalid_values';
import { CodeDanger, CodeSuccess } from '../../styles';
import * as i18n from '../translations';
import type { AllowedValue, EnrichedFieldMetadata, UnallowedValueCount } from '../../types';

export const EMPTY_PLACEHOLDER = '--';

export const getCommonTableColumns = (): Array<
  EuiTableFieldDataColumnType<EnrichedFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '20%',
  },
  {
    field: 'type',
    name: i18n.ECS_MAPPING_TYPE_EXPECTED,
    render: (type: string | undefined) => (
      <CodeSuccess data-test-subj="codeSuccess">
        {type != null ? type : EMPTY_PLACEHOLDER}
      </CodeSuccess>
    ),
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'indexFieldType',
    name: i18n.INDEX_MAPPING_TYPE_ACTUAL,
    render: (_, x) =>
      x.type != null && x.indexFieldType !== x.type ? (
        getIsInSameFamily({ ecsExpectedType: x.type, type: x.indexFieldType }) ? (
          <div>
            <CodeSuccess data-test-subj="codeSuccess">{x.indexFieldType}</CodeSuccess>
            <SameFamily />
          </div>
        ) : (
          <CodeDanger data-test-subj="codeDanger">{x.indexFieldType}</CodeDanger>
        )
      ) : (
        <CodeSuccess data-test-subj="codeSuccess">{x.indexFieldType}</CodeSuccess>
      ),
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'allowed_values',
    name: i18n.ECS_VALUES_EXPECTED,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'indexInvalidValues',
    name: i18n.DOCUMENT_VALUES_ACTUAL,
    render: (indexInvalidValues: UnallowedValueCount[]) => (
      <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'description',
    name: i18n.ECS_DESCRIPTION,
    render: (description: string | undefined) =>
      description != null ? (
        <span data-test-subj="description">{description}</span>
      ) : (
        <EuiCode data-test-subj="emptyDescription">{EMPTY_PLACEHOLDER}</EuiCode>
      ),
    sortable: false,
    truncateText: false,
    width: '20%',
  },
];
