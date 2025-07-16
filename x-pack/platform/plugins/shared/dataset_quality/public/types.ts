/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ComponentType } from 'react';
import type { PluginSetupContract as AlertingPublicSetup } from '@kbn/alerting-plugin/public/plugin';
import type { PluginStartContract as AlertingPublicStart } from '@kbn/alerting-plugin/public/plugin';
import type { DatasetQualityProps } from './components/dataset_quality';
import type { DatasetQualityDetailsProps } from './components/dataset_quality_details';
import type { CreateDatasetQualityController } from './controller/dataset_quality';
import type { CreateDatasetQualityDetailsController } from './controller/dataset_quality_details';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}

export interface DatasetQualityPluginStart {
  DatasetQuality: ComponentType<DatasetQualityProps>;
  createDatasetQualityController: CreateDatasetQualityController;
  DatasetQualityDetails: ComponentType<DatasetQualityDetailsProps>;
  createDatasetQualityDetailsController: CreateDatasetQualityDetailsController;
}

export interface DatasetQualityStartDeps {
  alerting: AlertingPublicStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  lens: LensPublicStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface DatasetQualitySetupDeps {
  alerting?: AlertingPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}
