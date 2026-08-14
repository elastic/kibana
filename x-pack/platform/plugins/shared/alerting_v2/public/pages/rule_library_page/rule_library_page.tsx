/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { experimentalBadge } from '../../components/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

export const RuleLibraryPage = () => {
  useBreadcrumbs('rule_library_list');

  return (
    <div data-test-subj="ruleLibraryPage">
      <AppHeader
        sticky={false}
        title={RULE_LIBRARY_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
      />
      <EuiSpacer size="m" />
      <EuiEmptyPrompt
        data-test-subj="ruleLibraryEmptyPrompt"
        iconType="indexOpen"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.ruleLibrary.emptyTitle"
              defaultMessage="No rule templates"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.alertingV2.ruleLibrary.emptyBody"
              defaultMessage="Rule templates are provided by Fleet integrations. Update or install integrations to view available rule templates."
            />
          </p>
        }
      />
    </div>
  );
};
