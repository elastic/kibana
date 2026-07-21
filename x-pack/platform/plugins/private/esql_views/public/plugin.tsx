/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { LIST_BREADCRUMB, PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { CreateEditEsqlViewFlyoutProps } from './create_edit_view_flyout';
import type { EsqlViewsPublicStart, SetupDependencies, StartDependencies } from './types';

const LazyCreateEsqlViewFlyout = React.lazy(() =>
  import('./create_edit_view_flyout_v2').then((module) => ({
    default: module.CreateEditEsqlViewFlyoutV2,
  }))
);

const CreateEsqlViewFlyout: React.FunctionComponent<CreateEditEsqlViewFlyoutProps> = (props) => (
  <React.Suspense fallback={null}>
    <LazyCreateEsqlViewFlyout {...props} />
  </React.Suspense>
);

export class EsqlViewsPlugin
  implements Plugin<void, EsqlViewsPublicStart, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    management.sections.section.kibana.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      // Places this entry right after Saved Objects (order: 1) and before
      // Tags (order: 1.5) in the classic Stack Management sidebar.
      order: 1.1,
      async mount(params: ManagementAppMountParams) {
        const { mountManagementSection } = await import('./mount_management_section');
        const [coreStart, pluginsStart] = await core.getStartServices();

        const { docTitle } = coreStart.chrome;
        docTitle.change(PLUGIN_NAME);

        const { setBreadcrumbs } = params;
        setBreadcrumbs(LIST_BREADCRUMB);

        const unmountAppCallback = mountManagementSection(coreStart, pluginsStart, params);
        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });
  }

  public start(): EsqlViewsPublicStart {
    return { CreateEsqlViewFlyout };
  }
}
