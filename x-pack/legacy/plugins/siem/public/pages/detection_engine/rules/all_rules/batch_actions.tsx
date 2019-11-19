/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import { enableRules } from '../../../../containers/detection_engine/rules/api';
import * as i18n from '../translations';
import { Action, ColumnTypes } from './index';

export const getBatchItems = (
  selectedState: ColumnTypes[],
  dispatch: React.Dispatch<Action>,
  closePopover: () => void
) => {
  const containsEnabled = selectedState.some(v => v.activate);
  const containsDisabled = selectedState.some(v => !v.activate);

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      icon="checkInCircleFilled"
      disabled={!containsDisabled}
      onClick={() => {
        closePopover();
        console.log('enable rules', selectedState);
        const enableResponse = enableRules({
          ruleIds: selectedState.filter(s => !s.activate).map(s => s.rule_id),
          enabled: true,
          kbnVersion: '8.0.0',
        });
        console.log('enable resp', enableResponse);
      }}
    >
      {i18n.BATCH_ACTION_ACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
      icon="crossInACircleFilled"
      disabled={!containsEnabled}
      onClick={async () => {
        closePopover();
        console.log('disable rules', selectedState);
        const disableResponse = enableRules({
          ruleIds: selectedState.filter(s => s.activate).map(s => s.rule_id),
          enabled: false,
          kbnVersion: '8.0.0',
        });
        console.log('delete resp', disableResponse);
      }}
    >
      {i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      icon="exportAction"
      disabled={true}
      onClick={() => {
        closePopover();
        console.log('yoyooy');
      }}
    >
      {i18n.BATCH_ACTION_EXPORT_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
      icon="indexEdit"
      disabled={true}
      onClick={() => {
        closePopover();
        console.log('yoyooy');
      }}
    >
      {i18n.BATCH_ACTION_EDIT_INDEX_PATTERNS}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      icon="trash"
      onClick={() => {
        closePopover();
        console.log('deltheseplz', selectedState);
        // const deleteResponse = deleteRules({
        //   ruleIds: selectedState.map(s => s.rule_id),
        //   kbnVersion: '8.0.0',
        // });
        dispatch({
          type: 'updateSelection',
          rules: selectedState.map(r => r.sourceRule),
          isLoading: true,
        });
        // console.log('delete resp', deleteResponse);
      }}
      disabled={selectedState.length === 0}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
