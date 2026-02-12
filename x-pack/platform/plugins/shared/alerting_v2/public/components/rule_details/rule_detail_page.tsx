/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeader } from '@elastic/eui';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export interface RuleDetailPageProps {
  rule: CreateRuleData;
}

export const RuleDetailPage: React.FunctionComponent<RuleDetailPageProps> = ({ rule }) => {
  return (
    <>
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={
          <span data-test-subj="ruleName">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleDetailsTitle"
              defaultMessage="{ruleName}"
              values={{ ruleName: rule.name }}
            />
          </span>
        }
      />
    </>
  );
};
