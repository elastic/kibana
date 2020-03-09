/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import * as i18n from './translations';

interface GetBulkItems {
  closePopover: () => void;
  deleteCasesAction: (cases: string[]) => void;
  selectedCaseIds: string[];
  caseStatus: string;
}

export const getBulkItems = ({
  deleteCasesAction,
  closePopover,
  caseStatus,
  selectedCaseIds,
}: GetBulkItems) => {
  return [
    caseStatus === 'open' ? (
      <EuiContextMenuItem
        key={i18n.BULK_ACTION_CLOSE_SELECTED}
        icon="magnet"
        disabled={true} // TO DO
        onClick={async () => {
          closePopover();
        }}
      >
        {i18n.BULK_ACTION_CLOSE_SELECTED}
      </EuiContextMenuItem>
    ) : (
      <EuiContextMenuItem
        key={i18n.BULK_ACTION_OPEN_SELECTED}
        icon="magnet"
        disabled={true} // TO DO
        onClick={() => {
          closePopover();
        }}
      >
        {i18n.BULK_ACTION_OPEN_SELECTED}
      </EuiContextMenuItem>
    ),
    <EuiContextMenuItem
      key={i18n.BULK_ACTION_DELETE_SELECTED}
      icon="trash"
      onClick={async () => {
        closePopover();
        deleteCasesAction(selectedCaseIds);
      }}
    >
      {i18n.BULK_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
