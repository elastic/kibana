/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFieldRulesPanelContext } from './context';

export const FieldRulesPanelHeader = () => {
  const { policyCounters } = useFieldRulesPanelContext();

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('anonymizationUi.profiles.fieldRules.title', {
            defaultMessage: 'Field policy rules',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiStat
            title={policyCounters.allow}
            description={i18n.translate('anonymizationUi.profiles.fieldRules.counter.allow', {
              defaultMessage: 'Allowed',
            })}
            titleSize="xxs"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={policyCounters.anonymize}
            description={i18n.translate('anonymizationUi.profiles.fieldRules.counter.anonymize', {
              defaultMessage: 'Anonymized',
            })}
            titleSize="xxs"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={policyCounters.deny}
            description={i18n.translate('anonymizationUi.profiles.fieldRules.counter.deny', {
              defaultMessage: 'Denied',
            })}
            titleSize="xxs"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
