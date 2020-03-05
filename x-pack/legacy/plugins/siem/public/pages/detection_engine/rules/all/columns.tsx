/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBadge,
  EuiLink,
  EuiHealth,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import * as H from 'history';
import React, { Dispatch } from 'react';

import { Rule } from '../../../../containers/detection_engine/rules';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { FormattedDate } from '../../../../components/formatted_date';
import { getRuleDetailsUrl } from '../../../../components/link_to/redirect_to_detection_engine';
import { ActionToaster } from '../../../../components/toasters';
import { TruncatableText } from '../../../../components/truncatable_text';
import { getStatusColor } from '../components/rule_status/helpers';
import { RuleSwitch } from '../components/rule_switch';
import { SeverityBadge } from '../components/severity_badge';
import * as i18n from '../translations';
import {
  deleteRulesAction,
  duplicateRulesAction,
  editRuleAction,
  exportRulesAction,
} from './actions';
import { Action } from './reducer';

export const getActions = (
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History,
  reFetchRules: (refreshPrePackagedRule?: boolean) => void
) => [
  {
    description: i18n.EDIT_RULE_SETTINGS,
    type: 'icon',
    icon: 'visControls',
    name: i18n.EDIT_RULE_SETTINGS,
    onClick: (rowItem: Rule) => editRuleAction(rowItem, history),
    enabled: (rowItem: Rule) => !rowItem.immutable,
  },
  {
    description: i18n.DUPLICATE_RULE,
    type: 'icon',
    icon: 'copy',
    name: i18n.DUPLICATE_RULE,
    onClick: async (rowItem: Rule) => {
      await duplicateRulesAction([rowItem], [rowItem.id], dispatch, dispatchToaster);
      await reFetchRules(true);
    },
  },
  {
    description: i18n.EXPORT_RULE,
    type: 'icon',
    icon: 'exportAction',
    name: i18n.EXPORT_RULE,
    onClick: (rowItem: Rule) => exportRulesAction([rowItem.rule_id], dispatch),
    enabled: (rowItem: Rule) => !rowItem.immutable,
  },
  {
    description: i18n.DELETE_RULE,
    type: 'icon',
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: async (rowItem: Rule) => {
      await deleteRulesAction([rowItem.id], dispatch, dispatchToaster);
      await reFetchRules(true);
    },
  },
];

type RulesColumns = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;

interface GetColumns {
  dispatch: React.Dispatch<Action>;
  dispatchToaster: Dispatch<ActionToaster>;
  history: H.History;
  hasNoPermissions: boolean;
  loadingRuleIds: string[];
  reFetchRules: (refreshPrePackagedRule?: boolean) => void;
}

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const getColumns = ({
  dispatch,
  dispatchToaster,
  history,
  hasNoPermissions,
  loadingRuleIds,
  reFetchRules,
}: GetColumns): RulesColumns[] => {
  const cols: RulesColumns[] = [
    {
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: Rule['name'], item: Rule) => (
        <EuiLink href={getRuleDetailsUrl(item.id)}>{value}</EuiLink>
      ),
      truncateText: true,
      width: '24%',
    },
    {
      field: 'risk_score',
      name: i18n.COLUMN_RISK_SCORE,
      truncateText: true,
      width: '14%',
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: Rule['severity']) => <SeverityBadge value={value} />,
      truncateText: true,
      width: '16%',
    },
    {
      field: 'status_date',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: Rule['status_date']) => {
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
      render: (value: Rule['status']) => {
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
      render: (value: Rule['tags']) => (
        <TruncatableText>
          {value.map((tag, i) => (
            <EuiBadge color="hollow" key={`${tag}-${i}`}>
              {tag}
            </EuiBadge>
          ))}
        </TruncatableText>
      ),
      truncateText: true,
      width: '20%',
    },
    {
      align: 'center',
      field: 'activate',
      name: i18n.COLUMN_ACTIVATE,
      render: (value: Rule['enabled'], item: Rule) => (
        <RuleSwitch
          dispatch={dispatch}
          id={item.id}
          enabled={item.enabled}
          isDisabled={hasNoPermissions}
          isLoading={loadingRuleIds.includes(item.id)}
        />
      ),
      sortable: true,
      width: '95px',
    },
  ];
  const actions: RulesColumns[] = [
    {
      actions: getActions(dispatch, dispatchToaster, history, reFetchRules),
      width: '40px',
    } as EuiTableActionsColumnType<Rule>,
  ];

  return hasNoPermissions ? cols : [...cols, ...actions];
};
