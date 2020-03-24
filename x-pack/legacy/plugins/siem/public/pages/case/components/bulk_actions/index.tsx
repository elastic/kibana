/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import * as i18n from './translations';

interface GetBulkItems {
  caseStatus: string;
  closePopover: () => void;
  deleteCasesAction: (cases: string[]) => void;
  selectedCaseIds: string[];
  updateCaseStatus: (status: string) => void;
}

export const getBulkItems = ({
  caseStatus,
  closePopover,
  deleteCasesAction,
  selectedCaseIds,
  updateCaseStatus,
}: GetBulkItems) => {
  return [
    caseStatus === 'open' ? (
      <EuiContextMenuItem
        data-test-subj="cases-bulk-close-button"
        disabled={selectedCaseIds.length === 0}
        key={i18n.BULK_ACTION_CLOSE_SELECTED}
        icon="folderCheck"
        onClick={() => {
          closePopover();
          updateCaseStatus('closed');
        }}
      >
        {i18n.BULK_ACTION_CLOSE_SELECTED}
      </EuiContextMenuItem>
    ) : (
      <EuiContextMenuItem
        data-test-subj="cases-bulk-open-button"
        disabled={selectedCaseIds.length === 0}
        key={i18n.BULK_ACTION_OPEN_SELECTED}
        icon="folderExclamation"
        onClick={() => {
          closePopover();
          updateCaseStatus('open');
        }}
      >
        {i18n.BULK_ACTION_OPEN_SELECTED}
      </EuiContextMenuItem>
    ),
    <EuiContextMenuItem
      data-test-subj="cases-bulk-delete-button"
      key={i18n.BULK_ACTION_DELETE_SELECTED}
      icon="trash"
      disabled={selectedCaseIds.length === 0}
      onClick={() => {
        closePopover();
        deleteCasesAction(selectedCaseIds);
      }}
    >
      {i18n.BULK_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
