/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

export interface AlertEpisodeDetailsServices {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  http: HttpStart;
  spaces: SpacesPluginStart;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
  userProfile: UserProfileService;
}
