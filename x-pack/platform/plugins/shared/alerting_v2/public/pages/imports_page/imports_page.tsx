/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

const IMPORTS_PAGE_TITLE = i18n.translate('xpack.alertingV2.imports.pageTitle', {
  defaultMessage: 'Import alerts',
});

/** Lists the alert imports of the current space. */
export const ImportsPage = () => {
  useBreadcrumbs('imports_list');

  return (
    <div data-test-subj="alertingV2ImportsPage">
      <AppHeader sticky={false} title={IMPORTS_PAGE_TITLE} spacing="bleed" />
    </div>
  );
};
