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

// Michael: Will need to change this to get the current datetime format from Kibana settings.
const dateTimeFormat = (value: string) => {
  return moment(value).format('M/D/YYYY, h:mm A');
};

const actions = [
  {
    description: 'Edit rule settings',
    icon: 'visControls',
    name: 'Edit rule settings',
    onClick: () => {},
  },
  {
    description: 'Run rule manually…',
    icon: 'play',
    name: 'Run rule manually…',
    onClick: () => {},
  },
  {
    description: 'Duplicate rule…',
    icon: 'copy',
    name: 'Duplicate rule…',
    onClick: () => {},
  },
  {
    description: 'Export rule',
    icon: 'exportAction',
    name: 'Export rule',
    onClick: () => {},
  },
  {
    description: 'Delete rule…',
    icon: 'trash',
    name: 'Delete rule…',
    onClick: () => {},
  },
];

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const columns = [
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
    sortable: true,
    truncateText: true,
  },
  {
    field: 'severity',
    name: 'Severity',
    render: (value: ColumnTypes['severity']) => (
      <EuiHealth
        color={
          value === 'Low'
            ? euiLightVars.euiColorVis0
            : value === 'Medium'
            ? euiLightVars.euiColorVis5
            : value === 'High'
            ? euiLightVars.euiColorVis7
            : euiLightVars.euiColorVis9
        }
      >
        {value}
      </EuiHealth>
    ),
    sortable: true,
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
    sortable: true,
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
    sortable: true,
    truncateText: true,
    width: '20%',
  },
  {
    align: 'center',
    field: 'activate',
    name: 'Activate',
    render: (value: ColumnTypes['activate']) => (
      // Michael: Uncomment props below when EUI 14.9.0 is added to Kibana.
      <EuiSwitch
        checked={value}
        // label="Activate"
        onChange={() => {}}
        // showLabel={false}
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
