/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleCreatePrimaryOptions } from '../../components/rule_create_options/rule_create_options_panel';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useNavigateToAgentBuilder } from '../../hooks/use_navigate_to_agent_builder';

export const WhyV2QuickStart = () => {
  const { flyout, openCreateFlyout } = useComposeDiscoverFlyout();
  const navigateToAgentBuilder = useNavigateToAgentBuilder();

  return (
    <section data-test-subj="whyV2QuickStart">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.whyV2.quickStart.title"
            defaultMessage="Quick start"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.whyV2.quickStart.description"
            defaultMessage="Create your first Alerting v2 rule to get started."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <RuleCreatePrimaryOptions
        direction="row"
        onCreateEsqlRule={openCreateFlyout}
        onCreateWithAgent={navigateToAgentBuilder}
      />
      {flyout}
    </section>
  );
};
