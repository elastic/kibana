/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { npSetup, npStart } from 'ui/new_platform';
import { registerPainless } from './register_painless';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

npSetup.plugins.home.featureCatalogue.register({
  id: 'painlessLab',
  title: i18n.translate('xpack.painlessLab.registryProviderTitle', {
    defaultMessage: 'Painless Lab (beta)',
  }),
  description: i18n.translate('xpack.painlessLab.registryProviderDescription', {
    defaultMessage: 'Simulate and debug painless code',
  }),
  icon: '',
  path: '/app/kibana#/dev_tools/painless_lab',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.ADMIN,
});

npSetup.plugins.devTools.register({
  id: 'painless_lab',
  order: 7,
  title: (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.painlessLab.displayName', {
          defaultMessage: 'Painless Lab',
        })}
      </EuiFlexItem>

      <EuiFlexItem grow={false} className="painlessLab__betaLabelContainer">
        <EuiBetaBadge
          label={i18n.translate('xpack.painlessLab.displayNameBetaLabel', {
            defaultMessage: 'Beta',
          })}
          tooltipContent={i18n.translate('xpack.painlessLab.displayNameBetaTooltipText', {
            defaultMessage: 'This feature might change drastically in future releases',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) as any,
  enableRouting: false,
  disabled: false,
  tooltipContent: xpackInfo.get('features.painlessLab.message'),
  async mount(context, { element }) {
    registerPainless();

    // const licenseCheck = {
    //   showPage: xpackInfo.get('features.painlessLab.enableLink'),
    //   message: xpackInfo.get('features.painlessLab.message'),
    // };

    // if (!licenseCheck.showPage) {
    //   npStart.core.notifications.toasts.addDanger(licenseCheck.message);
    //   window.location.hash = '/dev_tools';
    //   return () => {};
    // }

    const { renderApp } = await import('./render_app');
    return renderApp(element, npStart.core);
  },
});
