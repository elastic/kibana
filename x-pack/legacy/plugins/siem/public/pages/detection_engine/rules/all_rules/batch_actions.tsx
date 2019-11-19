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
      icon="checkInCircleFilled"
      disabled={containsLoading || !containsDisabled}
      onClick={async () => {
        closePopover();
        const deactivatedRuleIds = selectedState.filter(s => !s.activate).map(s => s.rule_id);
        await enableRulesAction(deactivatedRuleIds, true, dispatch, kbnVersion);
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
        const activatedRuleIds = selectedState.filter(s => s.activate).map(s => s.rule_id);
        await enableRulesAction(activatedRuleIds, false, dispatch, kbnVersion);
      }}
    >
      {i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      icon="exportAction"
      disabled={true}
      onClick={async () => {
        closePopover();
        await exportRulesAction(
          selectedState.map(s => s.rule_id),
          dispatch
        );
      }}
    >
      {i18n.BATCH_ACTION_EXPORT_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
      icon="indexEdit"
      disabled={true}
      onClick={async () => {
        closePopover();
      }}
    >
      {i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      icon="trash"
      disabled={containsLoading || selectedState.length === 0}
      onClick={async () => {
        closePopover();
        await deleteRulesAction(
          selectedState.map(r => r.sourceRule.rule_id),
          dispatch,
          kbnVersion
        );
      }}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
