/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useContentListPhase } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { experimentalBadge } from '../../components/experimental_badge';
import { ImportsPocCallout } from './imports_poc_callout';

export const IMPORTS_PAGE_TITLE = i18n.translate('xpack.alertingV2.imports.pageTitle', {
  defaultMessage: 'Import alerts',
});

export interface ImportsListHeaderProps {
  canWrite: boolean;
  onSetUp: () => void;
}

/**
 * App header that reads the Content List phase so the primary action stays hidden in the true
 * empty state, where the empty prompt carries the same button. Renders under
 * ContentListProvider.
 */
export const ImportsListHeader = ({ canWrite, onSetUp }: ImportsListHeaderProps) => {
  const phase = useContentListPhase();
  const showAction = canWrite && phase !== 'empty' && phase !== 'initialLoad';

  const menu = useMemo<AppHeaderMenu | undefined>(
    () =>
      showAction
        ? {
            primaryActionItem: {
              id: 'setUpImport',
              label: i18n.translate('xpack.alertingV2.imports.setUpButton', {
                defaultMessage: 'Set up import',
              }),
              iconType: 'plusCircle',
              run: onSetUp,
              testId: 'importsSetUpButton',
            },
          }
        : undefined,
    [showAction, onSetUp]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={IMPORTS_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
        menu={menu}
      />
      <EuiSpacer size="m" />
      <ImportsPocCallout />
    </>
  );
};
