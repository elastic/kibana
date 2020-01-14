/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBadge,
  EuiIconTip,
  EuiLink,
  EuiTextColor,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import * as H from 'history';
import React, { Dispatch } from 'react';
import { getEmptyTagValue } from '../../../../components/empty_value';
import {
  deleteRulesAction,
  duplicateRuleAction,
  editRuleAction,
  exportRulesAction,
  runRuleAction,
} from './actions';

import { Action } from './reducer';
import { TableData } from '../types';
import * as i18n from '../translations';
import { PreferenceFormattedDate } from '../../../../components/formatted_date';
import { RuleSwitch } from '../components/rule_switch';
import { SeverityBadge } from '../components/severity_badge';
import { ActionToaster } from '../../../../components/toasters';

const getActions = (
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History
) => [
  {
    description: i18n.EDIT_RULE_SETTINGS,
    icon: 'visControls',
    name: i18n.EDIT_RULE_SETTINGS,
    onClick: (rowItem: TableData) => editRuleAction(rowItem.sourceRule, history),
    enabled: (rowItem: TableData) => !rowItem.sourceRule.immutable,
  },
  {
    description: i18n.RUN_RULE_MANUALLY,
    icon: 'play',
    name: i18n.RUN_RULE_MANUALLY,
    onClick: runRuleAction,
    enabled: () => false,
  },
  {
    description: i18n.DUPLICATE_RULE,
    icon: 'copy',
    name: i18n.DUPLICATE_RULE,
    onClick: (rowItem: TableData) =>
      duplicateRuleAction(rowItem.sourceRule, dispatch, dispatchToaster),
  },
  {
    description: i18n.EXPORT_RULE,
    icon: 'exportAction',
    name: i18n.EXPORT_RULE,
    onClick: (rowItem: TableData) => exportRulesAction([rowItem.sourceRule], dispatch),
    enabled: (rowItem: TableData) => !rowItem.immutable,
  },
  {
    description: i18n.DELETE_RULE,
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: (rowItem: TableData) => deleteRulesAction([rowItem.id], dispatch, dispatchToaster),
    enabled: (rowItem: TableData) => !rowItem.immutable,
  },
];

type RulesColumns = EuiBasicTableColumn<TableData> | EuiTableActionsColumnType<TableData>;

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const getColumns = (
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History,
  hasNoPermissions: boolean
): RulesColumns[] => {
  const cols: RulesColumns[] = [
    {
      field: 'rule',
      name: i18n.COLUMN_RULE,
      render: (value: TableData['rule']) => <EuiLink href={value.href}>{value.name}</EuiLink>,
      truncateText: true,
      width: '24%',
    },
    {
      field: 'method',
      name: i18n.COLUMN_METHOD,
      truncateText: true,
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: TableData['severity']) => <SeverityBadge value={value} />,
      truncateText: true,
    },
    {
      field: 'lastCompletedRun',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: TableData['lastCompletedRun']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <PreferenceFormattedDate value={new Date(value)} />
        );
      },
      sortable: true,
      truncateText: true,
      width: '16%',
    },
    {
      field: 'lastResponse',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: TableData['lastResponse']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <>
            {value.type === 'Fail' ? (
              <EuiTextColor color="danger">
                {value.type} <EuiIconTip content={value.message} type="iInCircle" />
              </EuiTextColor>
            ) : (
              <EuiTextColor color="secondary">{value.type}</EuiTextColor>
            )}
          </>
        );
      },
      truncateText: true,
    },
    {
      field: 'tags',
      name: i18n.COLUMN_TAGS,
      render: (value: TableData['tags']) => (
        <div>
          <>
            {value.map((tag, i) => (
              <EuiBadge color="hollow" key={i}>
                {tag}
              </EuiBadge>
            ))}
          </>
        </div>
      ),
      truncateText: true,
      width: '20%',
    },
    {
      align: 'center',
      field: 'activate',
      name: i18n.COLUMN_ACTIVATE,
      render: (value: TableData['activate'], item: TableData) => (
        <RuleSwitch
          dispatch={dispatch}
          id={item.id}
          enabled={item.activate}
          isDisabled={hasNoPermissions}
          isLoading={item.isLoading}
        />
      ),
      sortable: true,
      width: '85px',
    },
  ];
  const actions: RulesColumns[] = [
    {
      actions: getActions(dispatch, dispatchToaster, history),
      width: '40px',
    } as EuiTableActionsColumnType<TableData>,
  ];

  return hasNoPermissions ? cols : [...cols, ...actions];
};
