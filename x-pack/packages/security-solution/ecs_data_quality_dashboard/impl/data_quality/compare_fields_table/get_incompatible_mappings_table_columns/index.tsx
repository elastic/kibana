/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import React from 'react';

import { SameFamily } from '../../data_quality_panel/same_family';
import { CodeDanger, CodeSuccess } from '../../styles';
import * as i18n from '../translations';
import type { EnrichedFieldMetadata } from '../../types';

export const EMPTY_PLACEHOLDER = '--';

export const getIncompatibleMappingsTableColumns = (): Array<
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
    name: i18n.ECS_MAPPING_TYPE_EXPECTED,
    render: (type: string) => (
      <CodeSuccess data-test-subj="codeSuccess">
        {type != null ? type : EMPTY_PLACEHOLDER}
      </CodeSuccess>
    ),
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexFieldType',
    name: i18n.INDEX_MAPPING_TYPE_ACTUAL,
    render: (indexFieldType: string, x) =>
      x.isInSameFamily ? (
        <div>
          <CodeSuccess data-test-subj="codeSuccess">{indexFieldType}</CodeSuccess>
          <SameFamily />
        </div>
      ) : (
        <CodeDanger data-test-subj="codeDanger">{indexFieldType}</CodeDanger>
      ),
    sortable: true,
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
