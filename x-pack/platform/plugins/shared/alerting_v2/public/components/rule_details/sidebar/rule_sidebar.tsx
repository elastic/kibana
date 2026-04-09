/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleSidebarConditionsTab } from './rule_sidebar_conditions_tab';
import { RuleSidebarRunbookTab } from './rule_sidebar_runbook_tab';

const SIDEBAR_TAB_OPTIONS = [
  {
    id: 'conditions',
    label: i18n.translate('xpack.alertingV2.sidebar.conditionsTab', {
      defaultMessage: 'Conditions',
    }),
    'data-test-subj': 'sidebarConditionsTab',
  },
  {
    id: 'runbook',
    label: i18n.translate('xpack.alertingV2.sidebar.runbookTab', {
      defaultMessage: 'Runbook',
    }),
    'data-test-subj': 'sidebarRunbookTab',
  },
];

export interface RuleSidebarProps {
  rule: RuleApiResponse;
}

export const RuleSidebar: React.FC<RuleSidebarProps> = ({ rule }) => {
  const [selectedTab, setSelectedTab] = useState('conditions');

  return (
    <div>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.alertingV2.sidebar.title', {
                defaultMessage: 'Rule conditions',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.alertingV2.sidebar.tabSelection', {
              defaultMessage: 'Rule conditions view selection',
            })}
            options={SIDEBAR_TAB_OPTIONS}
            idSelected={selectedTab}
            onChange={(id) => setSelectedTab(id)}
            buttonSize="compressed"
            data-test-subj="sidebarTabGroup"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />

      {selectedTab === 'conditions' ? (
        <RuleSidebarConditionsTab rule={rule} />
      ) : (
        <RuleSidebarRunbookTab rule={rule} />
      )}
    </div>
  );
};
