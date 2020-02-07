/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { Dispatch } from 'react';
import * as H from 'history';
import * as i18n from '../translations';
import { TableData } from '../types';
import { Action } from './reducer';
import {
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
} from './actions';
import { ActionToaster } from '../../../../components/toasters';

export const getBatchItems = (
  selectedState: TableData[],
  dispatch: Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History,
  closePopover: () => void
) => {
  const containsEnabled = selectedState.some(v => v.activate);
  const containsDisabled = selectedState.some(v => !v.activate);
  const containsLoading = selectedState.some(v => v.isLoading);
  const containsImmutable = selectedState.some(v => v.immutable);

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      icon="checkInCircleFilled"
      disabled={containsLoading || !containsDisabled}
      onClick={async () => {
        closePopover();
        const deactivatedIds = selectedState.filter(s => !s.activate).map(s => s.id);
        await enableRulesAction(deactivatedIds, true, dispatch, dispatchToaster);
      }}
    >
      {i18n.BATCH_ACTION_ACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
      icon="crossInACircleFilled"
      disabled={containsLoading || !containsEnabled}
      onClick={async () => {
        closePopover();
        const activatedIds = selectedState.filter(s => s.activate).map(s => s.id);
        await enableRulesAction(activatedIds, false, dispatch, dispatchToaster);
      }}
    >
      {i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      icon="exportAction"
      disabled={containsImmutable || containsLoading || selectedState.length === 0}
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
      key={i18n.BATCH_ACTION_DUPLICATE_SELECTED}
      icon="copy"
      disabled={containsLoading || selectedState.length === 0}
      onClick={async () => {
        closePopover();
        await duplicateRulesAction(
          selectedState.map(s => s.sourceRule),
          dispatch,
          dispatchToaster
        );
      }}
    >
      {i18n.BATCH_ACTION_DUPLICATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      icon="trash"
      title={containsImmutable ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE : undefined}
      disabled={containsLoading || selectedState.length === 0}
      onClick={async () => {
        closePopover();
        await deleteRulesAction(
          selectedState.map(({ sourceRule: { id } }) => id),
          dispatch,
          dispatchToaster
        );
      }}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
