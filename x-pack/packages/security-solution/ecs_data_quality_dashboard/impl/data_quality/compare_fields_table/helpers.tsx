/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import { get } from 'lodash';
import { EcsAllowedValues } from './ecs_allowed_values';
import { IndexInvalidValues } from './index_invalid_values';
import { CodeSuccess } from '../styles';
import * as i18n from './translations';
import type {
  AllowedValue,
  EnrichedFieldMetadata,
  OnInValidValueUpdateCallback,
  UnallowedValueCount,
  UnallowedValueDoc,
  UnallowedValueDocTableItems,
} from '../types';
import { IndexInvalidDocs, IndexInvalidValueDropdown } from './index_invalid_docs';

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

export const getIncompatibleValuesTableColumns = (
  onInValidValueUpdateCallback?: () => void
): Array<EuiTableFieldDataColumnType<EnrichedFieldMetadata>> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '10%',
  },
  {
    field: 'allowed_values',
    name: i18n.ECS_VALUES_EXPECTED,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '10%',
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
    field: 'indexInvalidDocs',
    name: i18n.DOCUMENTS_ACTUAL,
    render: (indexInvalidDocs: UnallowedValueDoc[], record: EnrichedFieldMetadata) => (
      <IndexInvalidDocs
        indexInvalidDocs={indexInvalidDocs}
        indexFieldName={record.indexFieldName}
        allowedValues={record.allowed_values}
        onInValidValueUpdateCallback={onInValidValueUpdateCallback}
      />
    ),
    sortable: false,
    truncateText: false,
    width: '30%',
  },
  {
    field: 'description',
    name: i18n.ECS_DESCRIPTION,
    sortable: false,
    truncateText: false,
    width: '15%',
  },
];

export const getIncompatibleDocsTableColumns = (
  onInValidValueUpdateCallback?: OnInValidValueUpdateCallback
): Array<EuiTableFieldDataColumnType<UnallowedValueDocTableItems>> => [
  // {
  //   field: 'indexFieldName',
  //   name: i18n.FIELD,
  //   sortable: false,
  //   truncateText: false,
  //   width: '25%',
  // },
  // {
  //   field: '_index',
  //   name: 'index',
  //   sortable: true,
  //   truncateText: false,
  //   width: '25%',
  // },
  {
    field: '_id',
    name: 'id',
    sortable: true,
    truncateText: false,
    width: '30%',
  },
  {
    field: '@timestamp',
    name: 'timestamp',
    sortable: true,
    truncateText: false,
    width: '30%',
  },
  {
    field: 'updatedFieldValues',
    name: i18n.CURRENT_VALUE,
    sortable: false,
    truncateText: false,
    width: '40%',
    render: (updatedFieldValues, record) => (
      <IndexInvalidValueDropdown
        allowedValues={record.allowedValues}
        id={record._id}
        indexFieldName={record.indexFieldName}
        indexInvalidValue={updatedFieldValues}
        indexName={record._index}
        onInValidValueUpdateCallback={onInValidValueUpdateCallback}
      />
    ),
  },
];

export const getIncompatibleDocsTableRows = ({
  indexInvalidDocs,
  indexFieldName,
  allowedValues,
}: {
  indexInvalidDocs: UnallowedValueDoc[];
  indexFieldName: string;
  allowedValues: AllowedValue[] | undefined;
}): UnallowedValueDocTableItems[] => {
  return indexInvalidDocs.map((doc) => {
    return {
      indexFieldName,
      allowedValues,
      _index: doc._index,
      _id: doc._id,
      '@timestamp': doc._source['@timestamp'] as string,
      updatedFieldValues: get(doc._source, indexFieldName) as string,
    };
  });
};
