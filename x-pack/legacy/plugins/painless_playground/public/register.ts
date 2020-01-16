/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { npSetup, npStart } from 'ui/new_platform';
import { registerPainless } from './register_painless';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

npSetup.plugins.home.featureCatalogue.register({
  id: 'painless_playground',
  title: i18n.translate('xpack.painless_playground.registryProviderTitle', {
    defaultMessage: 'Painless Playground',
  }),
  description: i18n.translate('xpack.painless_playground.registryProviderDescription', {
    defaultMessage: 'Simulate and debug painless code',
  }),
  icon: '',
  path: '/app/kibana#/dev_tools/painless_playground',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.ADMIN,
});

npSetup.plugins.dev_tools.register({
  order: 7,
  title: i18n.translate('xpack.painless_playground.displayName', {
    defaultMessage: 'Painless Playground',
  }),
  id: 'painless_playground',
  enableRouting: false,
  disabled: false,
  tooltipContent: xpackInfo.get('features.painless_playground.message'),
  async mount(context, { element }) {
    registerPainless();
    /**
    const licenseCheck = {
      showPage: xpackInfo.get('features.painless_playground.enableLink'),
      message: xpackInfo.get('features.painless_playground.message'),
    };

    if (!licenseCheck.showPage) {
      npStart.core.notifications.toasts.addDanger(licenseCheck.message);
      window.location.hash = '/dev_tools';
      return () => {};
    }**/
    const { renderApp } = await import('./render_app');
    return renderApp(element, npStart);
  },
});
