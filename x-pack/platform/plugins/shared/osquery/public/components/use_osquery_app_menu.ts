/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useManageIntegration } from './manage_integration_link';

export const useOsqueryAppMenu = (
  extras?: Pick<AppHeaderMenu, 'primaryActionItem' | 'items'>
): AppHeaderMenu => {
  const { href, navigate } = useManageIntegration();

  return useMemo(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [...(extras?.items ?? [])];

    if (href) {
      items.push({
        id: 'manageIntegration',
        iconType: 'gear',
        label: i18n.translate('xpack.osquery.appNavigation.manageIntegrationButton', {
          defaultMessage: 'Manage integration',
        }),
        href,
        testId: 'osqueryManageIntegrationButton',
        run: () => {
          navigate();
        },
      });
    }

    return {
      items,
      primaryActionItem: extras?.primaryActionItem,
    };
  }, [extras?.items, extras?.primaryActionItem, href, navigate]);
};
