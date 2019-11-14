/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiHealth, EuiIconTip, EuiLink, EuiSwitch, EuiTextColor } from '@elastic/eui';
import React from 'react';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import moment from 'moment';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { ColumnTypes } from './index';
import {
  deleteRulesAction,
  duplicateRuleAction,
  editRuleAction,
  enableRulesAction,
  exportRuleAction,
  runRuleAction,
} from './actions';
import { enableRules } from '../../../../containers/detection_engine/rules/api';
import { RuleSwitch } from '../rule_switch';

// Michael: Will need to change this to get the current datetime format from Kibana settings.
const dateTimeFormat = (value: string) => {
  return moment(value).format('M/D/YYYY, h:mm A');
};

const actions = [
  {
    description: 'Edit rule settings',
    icon: 'visControls',
    name: 'Edit rule settings',
    onClick: editRuleAction,
    disabled: true,
  },
  {
    description: 'Run rule manually…',
    icon: 'play',
    name: 'Run rule manually…',
    onClick: runRuleAction,
    disabled: true,
  },
  {
    description: 'Duplicate rule…',
    icon: 'copy',
    name: 'Duplicate rule…',
    onClick: duplicateRuleAction,
  },
  {
    description: 'Export rule',
    icon: 'exportAction',
    name: 'Export rule',
    onClick: exportRuleAction,
  },
  {
    description: 'Delete rule…',
    icon: 'trash',
    name: 'Delete rule…',
    onClick: deleteRulesAction,
  },
];

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const getColumns = (updateRule: (isEnabled: boolean, ruleId: string) => void) => [
  {
    field: 'rule',
    name: 'Rule',
    render: (value: ColumnTypes['rule']) => (
      <div>
        <EuiLink href={value.href}>{value.name}</EuiLink>{' '}
        <EuiBadge color="hollow">{value.status}</EuiBadge>
      </div>
    ),
    sortable: true,
    truncateText: true,
    width: '24%',
  },
  {
    field: 'method',
    name: 'Method',
    truncateText: true,
  },
  {
    field: 'severity',
    name: 'Severity',
    render: (value: ColumnTypes['severity']) => (
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
    name: 'Last completed run',
    render: (value: ColumnTypes['lastCompletedRun']) => {
      return value === undefined ? (
        getEmptyTagValue()
      ) : (
        <time dateTime={value}>{dateTimeFormat(value)}</time>
      );
    },
    sortable: true,
    truncateText: true,
    width: '16%',
  },
  {
    field: 'lastResponse',
    name: 'Last response',
    render: (value: ColumnTypes['lastResponse']) => {
      return value === undefined ? (
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
    name: 'Tags',
    render: (value: ColumnTypes['tags']) => (
      <div>
        {typeof value !== 'string' ? (
          <>
            {value.map((tag, i) => (
              <EuiBadge color="hollow" key={i}>
                {tag}
              </EuiBadge>
            ))}
          </>
        ) : (
          <EuiBadge color="hollow">{value}</EuiBadge>
        )}
      </div>
    ),
    truncateText: true,
    width: '20%',
  },
  {
    align: 'center',
    field: 'activate',
    name: 'Activate',
    render: (value: ColumnTypes['activate'], item: ColumnTypes) => (
      <RuleSwitch
        ruleId={item.id}
        isEnabled={item.activate}
        onRuleStateChange={async (isEnabled, ruleId, setIsLoading) => {
          console.log('item.id', item.id);
          console.log('isEnabled', isEnabled);
          console.log('ruleId', ruleId);
          try {
            const response = await enableRules({
              ruleIds: [ruleId],
              enabled: isEnabled,
              kbnVersion: '8.0.0',
            });
            console.log('response', response);
          } finally {
            updateRule(isEnabled, ruleId);
            setIsLoading(false);
          }
        }}
      />
    ),
    sortable: true,
    width: '65px',
  },
  {
    actions,
    width: '40px',
  },
];
