/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import {
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS = {
  actionPolicies:
    `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_ACTION_POLICIES_APP_ID}.esqlRulesOnlyCalloutDismissed` as const,
  ruleLibrary:
    `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULE_LIBRARY_APP_ID}.esqlRulesOnlyCalloutDismissed` as const,
  executionHistory:
    `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EXECUTION_HISTORY_APP_ID}.esqlRulesOnlyCalloutDismissed` as const,
};

export type EsqlRulesOnlyCalloutPage = keyof typeof ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS;

const TITLE = i18n.translate('xpack.alertingV2.esqlRulesOnlyCallout.title', {
  defaultMessage: 'ES|QL rules only',
});

const DESCRIPTIONS: Record<EsqlRulesOnlyCalloutPage, React.ReactNode> = {
  actionPolicies: (
    <FormattedMessage
      id="xpack.alertingV2.esqlRulesOnlyCallout.actionPoliciesDescription"
      defaultMessage="Action policies apply to alerts from ES|QL rules and external alerts."
    />
  ),
  ruleLibrary: (
    <FormattedMessage
      id="xpack.alertingV2.esqlRulesOnlyCallout.ruleLibraryDescription"
      defaultMessage="Browse templates for ES|QL rules and create new rules from them."
    />
  ),
  executionHistory: (
    <FormattedMessage
      id="xpack.alertingV2.esqlRulesOnlyCallout.executionHistoryDescription"
      defaultMessage="Review past runs for ES|QL rules and action policies."
    />
  ),
};

export interface EsqlRulesOnlyCalloutProps {
  page: EsqlRulesOnlyCalloutPage;
}

/**
 * Dismissible info callout reinforcing that the page applies to ES|QL rules only.
 */
export const EsqlRulesOnlyCallout = ({ page }: EsqlRulesOnlyCalloutProps) => {
  const storageKey = ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS[page];
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(storageKey, false);

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        iconType="info"
        size="s"
        title={TITLE}
        onDismiss={() => setIsDismissed(true)}
        data-test-subj="esqlRulesOnlyCallout"
      >
        {DESCRIPTIONS[page]}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
