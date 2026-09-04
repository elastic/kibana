/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiIcon, EuiMarkdownFormat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRunbookContent } from '@kbn/alerting-v2-rule-form';
import { useRule } from '../rule_context';

export const RuleSidebarRunbookTab: React.FC = () => {
  const rule = useRule();
  const runbook = rule.artifacts?.find((artifact) => artifact.type === 'runbook');

  if (!runbook) {
    return (
      <EuiEmptyPrompt
        icon={<EuiIcon type="documentation" size="l" aria-hidden={true} />}
        titleSize="xs"
        paddingSize="m"
        title={
          <h3>
            {i18n.translate('xpack.alertingV2.sidebar.runbook.emptyTitle', {
              defaultMessage: 'No runbook',
            })}
          </h3>
        }
        body={
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.alertingV2.sidebar.runbook.emptyBody', {
                defaultMessage: 'No runbook has been added to this rule yet.',
              })}
            </p>
          </EuiText>
        }
        data-test-subj="sidebarRunbookEmpty"
      />
    );
  }

  return (
    <EuiMarkdownFormat data-test-subj="sidebarRunbookContent">
      {getRunbookContent(runbook)}
    </EuiMarkdownFormat>
  );
};
