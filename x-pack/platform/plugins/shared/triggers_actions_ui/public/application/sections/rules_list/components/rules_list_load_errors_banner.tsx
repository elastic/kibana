/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { LoadRulesError } from '../../../lib/rule_api/rules_helpers';

interface RulesListLoadErrorsBannerProps {
  errors: LoadRulesError[];
}

export const RulesListLoadErrorsBanner = ({ errors }: RulesListLoadErrorsBannerProps) => {
  return (
    <>
      <KbnWarningCallout
        size="s"
        data-test-subj="rulesListLoadErrorsBanner"
        title={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.loadErrorsBannerTitle"
            defaultMessage="{count, plural, one {# rule} other {# rules}} could not be loaded correctly"
            values={{ count: errors.length }}
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.loadErrorsBannerDescription"
            defaultMessage="The following rules might not work as expected. Check the Kibana server logs for more details."
          />
        </p>
        <ul>
          {errors.map(({ rule }) => (
            <li key={rule.id}>{rule.name ? `${rule.name} (${rule.id})` : rule.id}</li>
          ))}
        </ul>
      </KbnWarningCallout>
      <EuiSpacer size="s" />
    </>
  );
};
