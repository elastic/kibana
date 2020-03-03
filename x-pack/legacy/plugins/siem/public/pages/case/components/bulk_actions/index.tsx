/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { Case } from '../../../../containers/case/types';

interface GetBulkItems {
  // cases: Case[];
  closePopover: () => void;
  // dispatch: Dispatch<Action>;
  // dispatchToaster: Dispatch<ActionToaster>;
  // reFetchCases: (refreshPrePackagedCase?: boolean) => void;
  selectedCases: Case[];
}

export const getBulkItems = ({
  // cases,
  closePopover,
  // dispatch,
  // dispatchToaster,
  // reFetchCases,
  selectedCases,
}: GetBulkItems) => {
  return [
    <EuiContextMenuItem
      key={i18n.BULK_ACTION_DUPLICATE_SELECTED}
      icon="copy"
      disabled={true} // TO DO
      onClick={async () => {
        closePopover();
        // await duplicateCasesAction(
        //   cases.filter(c => selectedCases.includes(c.caseId)),
        //   selectedCases,
        //   dispatch,
        //   dispatchToaster
        // );
        // reFetchCases(true);
      }}
    >
      {i18n.BULK_ACTION_DUPLICATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BULK_ACTION_DELETE_SELECTED}
      icon="trash"
      disabled={true} // TO DO
      onClick={async () => {
        closePopover();
        // await deleteCasesAction(selectedCases, dispatch, dispatchToaster);
        // reFetchCases(true);
      }}
    >
      {i18n.BULK_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
