/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';
import { TableData } from '../types';
import { Action } from './reducer';
import { deleteRulesAction, enableRulesAction, exportRulesAction } from './actions';

export const getBatchItems = (
  selectedState: TableData[],
  dispatch: React.Dispatch<Action>,
  closePopover: () => void,
  kbnVersion: string
) => {
  const containsEnabled = selectedState.some(v => v.activate);
  const containsDisabled = selectedState.some(v => !v.activate);
  const containsLoading = selectedState.some(v => v.isLoading);

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      disabled={containsLoading || !containsDisabled}
      icon="checkInCircleFilled"
      onClick={async () => {
        closePopover();
        const deactivatedIds = selectedState.filter(s => !s.activate).map(s => s.id);
        await enableRulesAction(deactivatedIds, true, dispatch, kbnVersion);
      }}
    >
      {i18n.BATCH_ACTION_ACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
      disabled={containsLoading || !containsEnabled}
      icon="crossInACircleFilled"
      onClick={async () => {
        closePopover();
        const activatedIds = selectedState.filter(s => s.activate).map(s => s.id);
        await enableRulesAction(activatedIds, false, dispatch, kbnVersion);
      }}
    >
      {i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      disabled={containsLoading || selectedState.length === 0}
      icon="exportAction"
      onClick={async () => {
        closePopover();
        await exportRulesAction(
          selectedState.map(s => s.sourceRule),
          dispatch
        );
      }}
    >
      {i18n.BATCH_ACTION_EXPORT_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
      disabled={true}
      icon="indexEdit"
      onClick={async () => {
        closePopover();
      }}
    >
      {i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      disabled={containsLoading || selectedState.length === 0}
      icon="trash"
      onClick={async () => {
        closePopover();
        await deleteRulesAction(
          selectedState.map(({ sourceRule: { id } }) => id),
          dispatch,
          kbnVersion
        );
      }}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
