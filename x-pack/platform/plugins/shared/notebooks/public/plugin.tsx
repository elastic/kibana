/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { distinctUntilChanged, map, type Subscription } from 'rxjs';
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CustomContentPublicStart } from '@kbn/custom-content-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { APP_ID, APP_ROUTE, PLUGIN_NAME } from '../common/constants';
import { createPerformanceCheck$, type DeveloperToolbarStart } from './performance_check';

export interface NotebookStartDependencies {
  data: DataPublicPluginStart;
  lens: LensPublicStart;
  customContent?: CustomContentPublicStart;
  developerToolbar?: DeveloperToolbarStart;
}

const LazyPerformanceCheckToggle = lazy(async () => {
  const { PerformanceCheckToggle } = await import('./components/performance_check_toggle');
  return { default: PerformanceCheckToggle };
});

export class NotebookPlugin implements Plugin<void, void, {}, NotebookStartDependencies> {
  private readonly performanceCheck$ = createPerformanceCheck$();
  private toolbarSubscription?: Subscription;

  public setup(core: CoreSetup<NotebookStartDependencies>): void {
    core.application.register({
      id: APP_ID,
      title: PLUGIN_NAME,
      appRoute: APP_ROUTE,
      euiIconType: 'logoKibana',
      category: DEFAULT_APP_CATEGORIES.kibana,
      order: 8500,
      mount: async (params: AppMountParameters) => {
        const [[coreStart, plugins], { renderApp }] = await Promise.all([
          core.getStartServices(),
          import('./application'),
        ]);
        return renderApp({
          coreStart,
          plugins,
          params,
          performanceCheck$: this.performanceCheck$,
        });
      },
    });
  }

  public start(core: CoreStart, { developerToolbar }: NotebookStartDependencies): void {
    if (!developerToolbar) return;
    let unregister: (() => void) | undefined;
    this.toolbarSubscription = core.application.currentAppId$
      .pipe(
        map((appId) => appId === APP_ID),
        distinctUntilChanged()
      )
      .subscribe((isNotebookApp) => {
        unregister?.();
        unregister = isNotebookApp
          ? developerToolbar.registerItem({
              id: 'Notebook Performance Check',
              // Higher priority sorts first, placing this left of the toolbar's own items.
              priority: 1,
              children: (
                <Suspense fallback={null}>
                  <LazyPerformanceCheckToggle enabled$={this.performanceCheck$} />
                </Suspense>
              ),
            })
          : undefined;
      });
    this.toolbarSubscription.add(() => unregister?.());
  }

  public stop(): void {
    this.toolbarSubscription?.unsubscribe();
  }
}
