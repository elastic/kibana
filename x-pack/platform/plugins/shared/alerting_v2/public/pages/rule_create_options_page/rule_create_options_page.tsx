/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { RuleCreateOptionsPanel } from '../../components/rule_create_options/rule_create_options_panel';
import { paths } from '../../constants';

export const RuleCreateOptionsPage = () => {
  useBreadcrumbs('rule_create_options');
  const { flyout, openCreateFlyout } = useComposeDiscoverFlyout({
    createSuccessRedirectPath: paths.ruleList,
  });

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
      <RuleCreateOptionsPanel onCreateEsqlRule={openCreateFlyout} />
      {flyout}
    </div>
  );
};
