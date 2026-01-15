/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export type FileUploadKibanaReactContextValue =
  KibanaReactContextValue<FileUploadStartDependencies>;

export interface FileUploadStartDependencies {
  analytics: AnalyticsServiceStart;
  fileUpload: FileUploadPluginStart;
  share: SharePluginStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  uiSettings: CoreStart['uiSettings'];
  http: CoreStart['http'];
  application: CoreStart['application'];
  notifications: CoreStart['notifications'];
  coreStart: CoreStart;
}

export const useFileUploadKibana = () => useKibana<FileUploadStartDependencies>();
