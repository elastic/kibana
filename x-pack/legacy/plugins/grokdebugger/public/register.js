/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { npSetup, npStart } from 'ui/new_platform';

npSetup.plugins.dev_tools.register({
  order: 6,
  title: i18n.translate('xpack.grokDebugger.displayName', {
    defaultMessage: 'Grok Debugger',
  }),
  id: 'grokdebugger',
  enableRouting: false,
  disabled: !xpackInfo.get('features.grokdebugger.enableLink', false),
  tooltipContent: xpackInfo.get('features.grokdebugger.message'),
  async mount(context, { element }) {
    const licenseCheck = {
      showPage: xpackInfo.get('features.grokdebugger.enableLink'),
      message: xpackInfo.get('features.grokdebugger.message'),
    };
    if (!licenseCheck.showPage) {
      npStart.core.notifications.toasts.addDanger(licenseCheck.message);
      window.location.hash = '/dev_tools';
      return () => {};
    }
    const { renderApp } = await import('./render_app');
    return renderApp(element, npStart);
  },
});
