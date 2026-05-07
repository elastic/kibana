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
import { CreateRulePanel } from '../rules_list_page/create_rule_panel';

export const RuleMethodSelectorPage = () => {
  useBreadcrumbs('rules_list');

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage id="xpack.alertingV2.rulesList.pageTitle" defaultMessage="Rules" />
        }
      />
      <EuiSpacer size="m" />
      <CreateRulePanel />
    </div>
  );
};
