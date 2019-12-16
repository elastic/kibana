/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiBadge, EuiHealth, EuiIconTip, EuiLink, EuiTextColor } from '@elastic/eui';
import React from 'react';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { getEmptyTagValue } from '../../../../components/empty_value';
import {
  deleteRulesAction,
  duplicateRuleAction,
  editRuleAction,
  enableRulesAction,
  exportRulesAction,
  runRuleAction,
} from './actions';

import { Action } from './reducer';
import { TableData } from '../types';
import * as i18n from '../translations';
import { PreferenceFormattedDate } from '../../../../components/formatted_date';
import { RuleSwitch } from '../components/rule_switch';

const getActions = (dispatch: React.Dispatch<Action>, kbnVersion: string) => [
  {
    description: i18n.EDIT_RULE_SETTINGS,
    icon: 'visControls',
    name: i18n.EDIT_RULE_SETTINGS,
    onClick: editRuleAction,
    enabled: () => false,
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
    onClick: (rowItem: TableData) => duplicateRuleAction(rowItem.sourceRule, dispatch, kbnVersion),
  },
  {
    description: i18n.EXPORT_RULE,
    icon: 'exportAction',
    name: i18n.EXPORT_RULE,
    onClick: (rowItem: TableData) => exportRulesAction([rowItem.sourceRule], dispatch),
  },
  {
    description: i18n.DELETE_RULE,
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: (rowItem: TableData) => deleteRulesAction([rowItem.id], dispatch, kbnVersion),
  },
];

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const getColumns = (dispatch: React.Dispatch<Action>, kbnVersion: string) => [
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
    render: (value: TableData['severity']) => (
      <EuiHealth
        color={
          value === 'low'
            ? euiLightVars.euiColorVis0
            : value === 'medium'
            ? euiLightVars.euiColorVis5
            : value === 'high'
            ? euiLightVars.euiColorVis7
            : euiLightVars.euiColorVis9
        }
      >
        {value}
      </EuiHealth>
    ),
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
        id={item.id}
        enabled={item.activate}
        isLoading={item.isLoading}
        onRuleStateChange={async (enabled, id) => {
          await enableRulesAction([id], enabled, dispatch, kbnVersion);
        }}
      />
    ),
    sortable: true,
    width: '85px',
  },
  {
    actions: getActions(dispatch, kbnVersion),
    width: '40px',
  },
];
