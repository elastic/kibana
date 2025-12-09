/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { OnechatNavControl } from './onechat_nav_control';
import type { OnechatStartDependencies } from '../../types';
import type { OnechatPluginStart } from '../../types';

interface OnechatNavControlWithProviderDeps {
  coreStart: CoreStart;
  pluginsStart: OnechatStartDependencies;
  onechatService: OnechatPluginStart;
}

export const OnechatNavControlWithProvider = ({
  coreStart,
  pluginsStart,
  onechatService,
}: OnechatNavControlWithProviderDeps) => {
  return (
    <EuiErrorBoundary>
      <KibanaThemeProvider theme={coreStart.theme}>
        <KibanaContextProvider
          services={{
            ...coreStart,
            ...pluginsStart,
            onechat: onechatService,
          }}
        >
          <coreStart.i18n.Context>
            <OnechatNavControl />
          </coreStart.i18n.Context>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </EuiErrorBoundary>
  );
};
