/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { experimentalBadge } from '../../components/experimental_badge';
import { paths } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { UserCapabilities } from '../../services/user_capabilities';
import { ActionPoliciesTable } from './components/action_policies_table';

const ACTION_POLICIES_LIST_PAGE_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.pageTitle',
  { defaultMessage: 'Action Policies' }
);

const getActionPoliciesListMenu = ({
  navigateToCreate,
  canWrite,
}: {
  navigateToCreate: () => void;
  canWrite: boolean;
}): AppHeaderMenu => ({
  ...(canWrite && {
    primaryActionItem: {
      id: 'createActionPolicy',
      label: i18n.translate('xpack.alertingV2.actionPoliciesList.createPolicyButton', {
        defaultMessage: 'Create policy',
      }),
      iconType: 'plusInCircle',
      run: navigateToCreate,
      testId: 'createActionPolicyButton',
    },
  }),
});

export const ListActionPoliciesPage = () => {
  useBreadcrumbs('action_policies_list');

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const canWrite = useService(UserCapabilities).canWrite('actionPolicies');

  const navigateToCreate = useCallback(() => {
    navigateToUrl(basePath.prepend(paths.actionPolicyCreate));
  }, [navigateToUrl, basePath]);

  const actionPoliciesMenu = useMemo(
    () => getActionPoliciesListMenu({ navigateToCreate, canWrite }),
    [navigateToCreate, canWrite]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
        menu={actionPoliciesMenu}
      />
      <EuiSpacer size="m" />
      <ActionPoliciesTable />
    </>
  );
};
