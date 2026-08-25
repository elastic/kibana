/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { experimentalBadge } from '../../components/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useCreateFromTemplateQuery } from '../../hooks/use_create_from_template_query';
import { RuleLibraryList } from './rule_library_list';

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

export const RuleLibraryPage = () => {
  useBreadcrumbs('rule_library_list');
  const { flyout, openCreateFromTemplateFlyout } = useComposeDiscoverFlyout();
  useCreateFromTemplateQuery(openCreateFromTemplateFlyout);

  return (
    <div data-test-subj="ruleLibraryPage">
      <AppHeader
        sticky={false}
        title={RULE_LIBRARY_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
      />
      <EuiSpacer size="m" />
      <RuleLibraryList />
      {flyout}
    </div>
  );
};
