/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBadge,
  EuiLink,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiHealth,
} from '@elastic/eui';
import * as H from 'history';
import React, { Dispatch } from 'react';
import { getEmptyTagValue } from '../../../../components/empty_value';
import {
  deleteRulesAction,
  duplicateRulesAction,
  editRuleAction,
  exportRulesAction,
} from './actions';

import { Action } from './reducer';
import { TableData } from '../types';
import * as i18n from '../translations';
import { FormattedDate } from '../../../../components/formatted_date';
import { RuleSwitch } from '../components/rule_switch';
import { SeverityBadge } from '../components/severity_badge';
import { ActionToaster } from '../../../../components/toasters';
import { getStatusColor } from '../components/rule_status/helpers';

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
    description: i18n.DUPLICATE_RULE,
    icon: 'copy',
    name: i18n.DUPLICATE_RULE,
    onClick: (rowItem: TableData) =>
      duplicateRulesAction([rowItem.sourceRule], dispatch, dispatchToaster),
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
      width: '14%',
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: TableData['severity']) => <SeverityBadge value={value} />,
      truncateText: true,
      width: '16%',
    },
    {
      field: 'statusDate',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: TableData['statusDate']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedDate value={value} fieldName={i18n.COLUMN_LAST_COMPLETE_RUN} />
        );
      },
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      field: 'status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: TableData['status']) => {
        return (
          <>
            <EuiHealth color={getStatusColor(value ?? null)}>
              {value ?? getEmptyTagValue()}
            </EuiHealth>
          </>
        );
      },
      width: '16%',
      truncateText: true,
    },
    {
      field: 'tags',
      name: i18n.COLUMN_TAGS,
      render: (value: TableData['tags']) => (
        <>
          {value.map((tag, i) => (
            <EuiBadge color="hollow" key={`${tag}-${i}`}>
              {tag}
            </EuiBadge>
          ))}
        </>
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
      width: '95px',
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
