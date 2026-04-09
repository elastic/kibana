/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

/**
 * Kibana context services for the Alert episodes management UI
 * (`mountEpisodesApp` + `KibanaContextProvider`).
 */
export type AlertEpisodesKibanaServices = CoreStart & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  charts: ChartsPluginStart;
  storage: Storage;
  toastNotifications: CoreStart['notifications']['toasts'];
};
