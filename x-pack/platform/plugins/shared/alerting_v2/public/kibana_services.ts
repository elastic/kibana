/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { IUiSettingsClient, UserProfileService } from '@kbn/core/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';

/** Services shared by rule UI, episodes UI, and other alerting_v2 surfaces. */
export type AlertingV2KibanaServices = RuleFormServices & {
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  userProfile: UserProfileService;
  spaces: SpacesApi;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
  overlays: OverlayStart;
  rendering: CoreStart['rendering'];
  docLinks: DocLinksStart;
};

const servicesReady$ = new BehaviorSubject<AlertingV2KibanaServices | undefined>(undefined);

export const untilPluginStartServicesReady = (): Promise<AlertingV2KibanaServices> => {
  if (servicesReady$.value) return Promise.resolve(servicesReady$.value);
  return new Promise<AlertingV2KibanaServices>((resolve) => {
    const sub = servicesReady$.subscribe((deps) => {
      if (deps) {
        sub.unsubscribe();
        resolve(deps);
      }
    });
  });
};

export const setKibanaServices = (services: AlertingV2KibanaServices) => {
  servicesReady$.next(services);
};
