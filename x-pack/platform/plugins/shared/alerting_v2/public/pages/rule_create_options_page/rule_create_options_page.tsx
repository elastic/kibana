/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { RuleCreateOptionsPanel } from '../../components/rule_create_options/rule_create_options_panel';
import {
  paths,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
} from '../../constants';

export const RuleCreateOptionsPage = () => {
  const application = useService(CoreStart('application'));
  useBreadcrumbs('rule_create_options');
  const { flyout, openCreateFlyout } = useComposeDiscoverFlyout({
    createSuccessRedirectPath: paths.ruleList,
  });

  const navigateToAgentBuilder = () => {
    application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
    });
  };

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateOptions.pageTitle"
            defaultMessage="Rules"
          />
        }
      />
      <EuiSpacer size="m" />
      <RuleCreateOptionsPanel
        onCreateEsqlRule={openCreateFlyout}
        onCreateWithAgent={navigateToAgentBuilder}
      />
      {flyout}
    </div>
  );
};
