/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb, CoreStart } from 'src/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { get } from 'lodash';
import { AutocompleteProviderRegister } from 'src/plugins/data/public';
import { i18n as i18nFormatter } from '@kbn/i18n';
import { CreateGraphQLClient } from './framework_adapter_types';
import { UptimeApp, UptimeAppProps } from '../../../uptime_app';
import { getIntegratedAppAvailability } from './capabilities_adapter';
import {
  INTEGRATED_SOLUTIONS,
  PLUGIN,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
} from '../../../../common/constants';
import { getTelemetryMonitorPageLogger, getTelemetryOverviewPageLogger } from '../telemetry';
import { UMFrameworkAdapter, BootstrapUptimeApp } from '../../lib';
import { createApolloClient } from './apollo_client_adapter';

export const getKibanaFrameworkAdapter = (
  core: CoreStart,
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>
): UMFrameworkAdapter => {
  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks: { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL },
    http: { basePath },
    i18n,
  } = core;
  let breadcrumbs: ChromeBreadcrumb[] = [];
  core.chrome.getBreadcrumbs$().subscribe((nextBreadcrumbs?: ChromeBreadcrumb[]) => {
    breadcrumbs = nextBreadcrumbs || [];
  });
  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );
  const canSave = get(capabilities, 'uptime.save', false);
  const props: UptimeAppProps = {
    autocomplete,
    basePath: basePath.get(),
    canSave,
    client: createApolloClient(`${basePath.get()}/api/uptime/graphql`, 'true'),
    darkMode: core.uiSettings.get('theme:darkMode'),
    commonlyUsedRanges: core.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    i18n,
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    kibanaBreadcrumbs: breadcrumbs,
    logMonitorPageLoad: getTelemetryMonitorPageLogger('true', basePath.get()),
    logOverviewPageLoad: getTelemetryOverviewPageLogger('true', basePath.get()),
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: i18nFormatter.translate('xpack.uptime.header.appName', {
          defaultMessage: 'Uptime',
        }),
        links: [
          {
            linkType: 'documentation',
            href: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/xpack-uptime.html`,
          },
          {
            linkType: 'discuss',
            href: 'https://discuss.elastic.co/c/uptime',
          },
        ],
      }),
    routerBasename: basePath.prepend(PLUGIN.ROUTER_BASE_NAME),
    setBadge,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
  };

  return {
    // TODO: these parameters satisfy the interface but are no longer needed
    render: async (createComponent: BootstrapUptimeApp, cgc: CreateGraphQLClient) => {
      const node = await document.getElementById('react-uptime-root');
      if (node) {
        ReactDOM.render(<UptimeApp {...props} />, node);
      }
    },
  };
};
