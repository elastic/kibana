/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiButtonEmpty, EuiCode, EuiSwitch, EuiText } from '@elastic/eui';
import React from 'react';

import styled from 'styled-components';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
import { BulkActions } from '../bulk_actions';
import * as i18n from '../translations';
import { ContextEditorRow, FIELDS } from '../types';
import { InputCheckbox, PageSelectionCheckbox } from '../selection/table_selection_checkbox';
import {
  HandlePageChecked,
  HandlePageUnchecked,
  HandleRowChecked,
  HandleRowUnChecked,
} from '../selection/types';
import type {
  HandlePageReset,
  HandleRowReset,
  OnListUpdated,
} from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';

const AnonymizedButton = styled(EuiButtonEmpty)`
  max-height: 24px;
`;

export const getColumns = ({
  compressed = true,
  hasUpdateAIAssistantAnonymization,
  onListUpdated,
  rawData,
  anonymizationPageFields,
  selectedFields,
  handlePageChecked,
  handlePageUnchecked,
  handleRowChecked,
  handleRowUnChecked,
  totalItemCount,
  isSelectAll,
  anonymizationAllFields,
  handleRowReset,
  handlePageReset,
}: {
  compressed?: boolean;
  hasUpdateAIAssistantAnonymization: boolean;
  onListUpdated: OnListUpdated;
  rawData: Record<string, string[]> | null;
  anonymizationPageFields: FindAnonymizationFieldsResponse['data'];
  selectedFields: string[];
  handlePageChecked: HandlePageChecked;
  handlePageUnchecked: HandlePageUnchecked;
  handleRowChecked: HandleRowChecked;
  handleRowUnChecked: HandleRowUnChecked;
  totalItemCount: number;
  isSelectAll: boolean;
  anonymizationAllFields: FindAnonymizationFieldsResponse;
  handleRowReset: HandleRowReset;
  handlePageReset: HandlePageReset;
}): Array<EuiBasicTableColumn<ContextEditorRow>> => {
  const selectionColumn: EuiBasicTableColumn<ContextEditorRow> = {
    field: '',
    name: (
      <PageSelectionCheckbox
        handlePageChecked={handlePageChecked}
        handlePageUnchecked={handlePageUnchecked}
        anonymizationPageFields={anonymizationPageFields}
        selectedFields={selectedFields}
        totalItemCount={totalItemCount}
        handlePageReset={handlePageReset}
      />
    ),
    render: (row: ContextEditorRow) => (
      <InputCheckbox
        row={row}
        selectedFields={selectedFields}
        handleRowChecked={handleRowChecked}
        handleRowUnChecked={handleRowUnChecked}
        handleRowReset={handleRowReset}
      />
    ),
    width: '70px',
    sortable: false,
  };

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
          selected={anonymizationAllFields.data.filter((item) => item.field === row.field) ?? []}
          isSelectAll={isSelectAll}
          anonymizationAllFields={anonymizationAllFields}
          handleRowChecked={handleRowChecked}
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
          disabled={!hasUpdateAIAssistantAnonymization}
          label=""
          showLabel={false}
          compressed={compressed}
          onChange={() => {
            handleRowChecked(field);
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
          disabled={!allowed || !hasUpdateAIAssistantAnonymization}
          color={anonymized ? 'primary' : 'text'}
          flush="both"
          iconType={anonymized ? 'eyeClosed' : 'eye'}
          isSelected={anonymized ? true : false}
          onClick={() => {
            handleRowChecked(field);
            onListUpdated([
              {
                field,
                operation: anonymized ? 'remove' : 'add',
                update: rawData == null ? 'defaultAllowReplacement' : 'allowReplacement',
              },
            ]);
          }}
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
    ? [
        ...(hasUpdateAIAssistantAnonymization ? [selectionColumn] : []),
        ...baseColumns,
        ...(hasUpdateAIAssistantAnonymization ? [actionsColumn] : []),
      ]
    : [
        ...(hasUpdateAIAssistantAnonymization ? [selectionColumn] : []),
        ...baseColumns,
        valuesColumn,
        ...(hasUpdateAIAssistantAnonymization ? [actionsColumn] : []),
      ];
};
