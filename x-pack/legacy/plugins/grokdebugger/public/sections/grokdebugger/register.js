/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { devToolsSetup } from '../../../../../../../src/legacy/core_plugins/kibana/public/dev_tools';
import { render, unmountComponentAtNode } from 'react-dom';
import { GrokDebugger } from './components/grok_debugger';
import React from 'react';
import { I18nContext } from 'ui/i18n';
import  chrome  from 'ui/chrome';
import { npStart } from 'ui/new_platform';
import '../../services/grokdebugger';

devToolsSetup.register({
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
    const injector = await chrome.dangerouslyGetActiveInjector();
    const grokdebuggerService = injector.get('grokdebuggerService');
    render(
      <I18nContext>
        <GrokDebugger grokdebuggerService={grokdebuggerService} />
      </I18nContext>,
      element
    );
    return () => unmountComponentAtNode(element);
  },
});
