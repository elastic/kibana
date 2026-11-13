/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { ImportSetupFlyout } from '../../components/imports/import_setup_flyout';
import { ImportsTable } from '../../components/imports/imports_table';
import { useFetchImports } from '../../hooks/use_fetch_imports';

const IMPORTS_PAGE_TITLE = i18n.translate('xpack.alertingV2.imports.pageTitle', {
  defaultMessage: 'Import alerts',
});

/** Lists the alert imports of the current space. */
export const ImportsPage = () => {
  useBreadcrumbs('imports_list');
  const [isSetupFlyoutOpen, setIsSetupFlyoutOpen] = useState(false);
  const { data: imports = [], isLoading, error } = useFetchImports();

  const openSetupFlyout = useCallback(() => setIsSetupFlyoutOpen(true), []);
  const closeSetupFlyout = useCallback(() => setIsSetupFlyoutOpen(false), []);

  const headerMenu = useMemo(
    (): AppHeaderMenu => ({
      primaryActionItem: {
        id: 'setUpImport',
        label: i18n.translate('xpack.alertingV2.imports.setUpImportButton', {
          defaultMessage: 'Set up import',
        }),
        iconType: 'plusCircle',
        run: openSetupFlyout,
        testId: 'importsSetUpImportButton',
      },
    }),
    [openSetupFlyout]
  );

  return (
    <div data-test-subj="alertingV2ImportsPage">
      <AppHeader sticky={false} title={IMPORTS_PAGE_TITLE} spacing="bleed" menu={headerMenu} />
      <EuiSpacer size="m" />
      <ImportsTable items={imports} isLoading={isLoading} error={error} />
      {isSetupFlyoutOpen && <ImportSetupFlyout onClose={closeSetupFlyout} />}
    </div>
  );
};
