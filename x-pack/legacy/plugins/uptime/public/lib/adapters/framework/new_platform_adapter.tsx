/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb, CoreStart } from 'src/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { get } from 'lodash';
import { CreateGraphQLClient } from './framework_adapter_types';
import { UptimeApp, UptimeAppProps } from '../../../uptime_app';
import { getIntegratedAppAvailability } from './capabilities_adapter';
import { INTEGRATED_SOLUTIONS, PLUGIN } from '../../../../common/constants';
import { getTelemetryMonitorPageLogger, getTelemetryOverviewPageLogger } from '../telemetry';
import { renderUptimeKibanaGlobalHelp } from './kibana_global_help';
import { UMFrameworkAdapter, BootstrapUptimeApp } from '../../lib';
import { createApolloClient } from './apollo_client_adapter';

export const getKibanaFrameworkAdapter = (core: CoreStart): UMFrameworkAdapter => {
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
    basePath: basePath.get(),
    canSave,
    client: createApolloClient(`${basePath.get()}/api/uptime/graphql`, 'true'),
    darkMode: core.uiSettings.get('theme:darkMode'),
    i18n,
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    kibanaBreadcrumbs: breadcrumbs,
    logMonitorPageLoad: getTelemetryMonitorPageLogger('true', basePath.get()),
    logOverviewPageLoad: getTelemetryOverviewPageLogger('true', basePath.get()),
    renderGlobalHelpControls: () =>
      setHelpExtension((element: HTMLElement) => {
        ReactDOM.render(
          renderUptimeKibanaGlobalHelp(ELASTIC_WEBSITE_URL, DOC_LINK_VERSION),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
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
