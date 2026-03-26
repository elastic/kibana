/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../constants';
import { RulesListContent } from './rules_list_content';

export { SEARCH_DEBOUNCE_MS } from './rules_list_content';

export const RulesListPage = () => {
  const { basePath } = useService(CoreStart('http'));

  useBreadcrumbs('rules_list');

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.rulesList.pageTitle"
            defaultMessage="Alerting V2 Rules"
          />
        }
        rightSideItems={[
          <EuiButton
            key="create-rule"
            href={basePath.prepend(paths.ruleCreate)}
            data-test-subj="createRuleButton"
          >
            <FormattedMessage
              id="xpack.alertingV2.rulesList.createRuleButton"
              defaultMessage="Create rule"
            />
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="m" />
      <RulesListContent />
    </div>
  );
};
