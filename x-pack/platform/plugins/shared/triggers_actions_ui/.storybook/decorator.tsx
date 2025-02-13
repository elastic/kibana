/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { action } from '@storybook/addon-actions';
import { DecoratorFn } from '@storybook/react';
import { EMPTY, of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider, KibanaServices } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { NotificationsStart, ApplicationStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { KibanaContextProvider } from '../public/common/lib/kibana';
import { ExperimentalFeaturesService } from '../public/common/experimental_features_service';
import { getHttp } from './context/http';
import { getRuleTypeRegistry } from './context/rule_type_registry';
import { getActionTypeRegistry } from './context/action_type_registry';
import { getDefaultServicesApplication } from './context/application';

interface StorybookContextDecoratorProps {
  context: Parameters<DecoratorFn>[1];
  servicesApplicationOverride?: Partial<ApplicationStart>;
  servicesOverride?: Partial<KibanaServices>;
}

const queryClient = new QueryClient();

const handler = (type: string, ...rest: any[]) => {
  action(`${type} Toast`)(rest);
  return { id: uuidv4() };
};

const notifications: NotificationsStart = {
  toasts: {
    add: (params) => handler('add', params),
    addDanger: (params) => handler('danger', params),
    addError: (params) => handler('error', params),
    addWarning: (params) => handler('warning', params),
    addSuccess: (params) => handler('success', params),
    addInfo: (params) => handler('info', params),
    remove: () => {},
    get$: () => of([]),
  },
  showErrorDialog: () => {},
};

const userProfile = { getUserProfile$: () => of(null) };

export const StorybookContextDecorator: FC<PropsWithChildren<StorybookContextDecoratorProps>> = (
  props
) => {
  const { children, context, servicesApplicationOverride, servicesOverride } = props;
  const { globals } = context;
  const { euiTheme } = globals;

  const darkMode = ['v8.dark', 'v7.dark'].includes(euiTheme);
  ExperimentalFeaturesService.init({
    experimentalFeatures: {
      rulesListDatagrid: true,
      ruleTagFilter: true,
      stackAlertsPage: true,
      ruleStatusFilter: true,
      rulesDetailLogs: true,
      ruleUseExecutionStatus: false,
      ruleKqlBar: true,
      isMustacheAutocompleteOn: false,
      showMustacheAutocompleteSwitch: false,
      isUsingRuleCreateFlyout: false,
      alertDeletionSettingsEnabled: false,
    },
  });

  const baseTheme = useElasticChartsTheme();

  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={darkMode}>
        <KibanaThemeProvider theme$={EMPTY} userProfile={userProfile}>
          <KibanaContextProvider
            services={{
              notifications,
              uiSettings: {
                get: () => {
                  if (context.componentId === 'app-ruleslist') {
                    return 'format:number:defaultPattern';
                  }
                },
                get$: () => {
                  if (context.componentId === 'app-ruleslist') {
                    return of('format:number:defaultPattern');
                  }
                },
              },
              application: getDefaultServicesApplication(servicesApplicationOverride),
              http: getHttp(context),
              actionTypeRegistry: getActionTypeRegistry(),
              ruleTypeRegistry: getRuleTypeRegistry(),
              charts: {
                theme: {
                  useChartsBaseTheme: () => baseTheme,
                  useSparklineOverrides: () => ({
                    lineSeriesStyle: {
                      point: {
                        visible: false,
                        strokeWidth: 1,
                        radius: 1,
                      },
                    },
                    areaSeriesStyle: {
                      point: {
                        visible: false,
                        strokeWidth: 1,
                        radius: 1,
                      },
                    },
                  }),
                },
              },
              ...servicesOverride,
            }}
          >
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};
