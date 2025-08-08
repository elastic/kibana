/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBasicTableColumn } from '@elastic/eui';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
import { ContextEditorRow } from '../types';
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
} from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';

export const getSelectionColumns = ({
  anonymizationPageFields,
  handlePageChecked,
  handlePageReset,
  handlePageUnchecked,
  handleRowChecked,
  handleRowReset,
  handleRowUnChecked,
  hasUpdateAIAssistantAnonymization,
  selectedFields,
  totalItemCount,
}: {
  anonymizationPageFields: FindAnonymizationFieldsResponse['data'];
  handlePageChecked: HandlePageChecked;
  handlePageReset: HandlePageReset;
  handlePageUnchecked: HandlePageUnchecked;
  handleRowChecked: HandleRowChecked;
  handleRowReset: HandleRowReset;
  handleRowUnChecked: HandleRowUnChecked;
  hasUpdateAIAssistantAnonymization: boolean;
  selectedFields: string[];
  totalItemCount: number;
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

  return hasUpdateAIAssistantAnonymization ? [selectionColumn] : [];
};
