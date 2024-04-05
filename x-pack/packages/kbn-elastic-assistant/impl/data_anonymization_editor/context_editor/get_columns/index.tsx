/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiButtonEmpty, EuiCode, EuiSwitch, EuiText } from '@elastic/eui';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { BulkActions } from '../bulk_actions';
import * as i18n from '../translations';
import { BatchUpdateListItem, ContextEditorRow, FIELDS } from '../types';

const AnonymizedButton = styled(EuiButtonEmpty)`
  max-height: 24px;
`;

export const getColumns = ({
  onListUpdated,
  rawData,
}: {
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  rawData: Record<string, string[]> | null;
}): Array<EuiBasicTableColumn<ContextEditorRow>> => {
  const actionsColumn: EuiBasicTableColumn<ContextEditorRow> = {
    field: FIELDS.ACTIONS,
    name: '',
    render: (_, row) => {
      return (
        <BulkActions
          appliesTo="singleRow"
          disabled={false}
          disableAllow={row.allowed}
          disableDeny={!row.allowed}
          disableAnonymize={!row.allowed || (row.allowed && row.anonymized)}
          disableUnanonymize={!row.allowed || (row.allowed && !row.anonymized)}
          onListUpdated={onListUpdated}
          onlyDefaults={rawData == null}
          selected={[row]}
        />
      );
    },
    sortable: false,
    width: '36px',
  };

  const valuesColumn: EuiBasicTableColumn<ContextEditorRow> = {
    field: FIELDS.RAW_VALUES,
    name: i18n.VALUES,
    render: (rawValues: ContextEditorRow['rawValues']) => (
      <EuiCode data-test-subj="rawValues">{rawValues.join(',')}</EuiCode>
    ),
    sortable: false,
  };

  const baseColumns: Array<EuiBasicTableColumn<ContextEditorRow>> = [
    {
      field: FIELDS.ALLOWED,
      name: i18n.ALLOWED,
      render: (_, { allowed, field }) => (
        <EuiSwitch
          data-test-subj="allowed"
          checked={allowed}
          label=""
          showLabel={false}
          onChange={() => {
            onListUpdated([
              {
                field,
                operation: allowed ? 'remove' : 'add',
                update: rawData == null ? 'defaultAllow' : 'allow',
              },
            ]);
          }}
        />
      ),
      sortable: true,
      width: '75px',
    },
    {
      field: FIELDS.ANONYMIZED,
      name: i18n.ANONYMIZED,
      render: (_, { allowed, anonymized, field }) => (
        <AnonymizedButton
          data-test-subj="anonymized"
          disabled={!allowed}
          color={anonymized ? 'primary' : 'text'}
          flush="both"
          iconType={anonymized ? 'eyeClosed' : 'eye'}
          isSelected={anonymized ? true : false}
          onClick={() =>
            onListUpdated([
              {
                field,
                operation: anonymized ? 'remove' : 'add',
                update: rawData == null ? 'defaultAllowReplacement' : 'allowReplacement',
              },
            ])
          }
        >
          <EuiText size="xs">{anonymized ? i18n.YES : i18n.NO}</EuiText>
        </AnonymizedButton>
      ),
      sortable: true,
      width: '102px',
    },
    {
      field: FIELDS.FIELD,
      name: i18n.FIELD,
      sortable: true,
      width: '260px',
    },
  ];

  return rawData == null
    ? [...baseColumns, actionsColumn]
    : [...baseColumns, valuesColumn, actionsColumn];
};
