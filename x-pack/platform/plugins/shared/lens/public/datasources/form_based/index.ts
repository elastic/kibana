/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { createStartServicesGetter, Storage } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart, FieldFormatsSetup } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { EditorFrameSetup } from '../../types';

export type { PersistedIndexPatternLayer, FormulaPublicApi } from './types';

export interface FormBasedDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  fieldFormats: FieldFormatsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface FormBasedDatasourceStartPlugins {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  share?: SharePluginStart;
  fieldFormats: FieldFormatsStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}

export class FormBasedDatasource {
  setup(
    core: CoreSetup<FormBasedDatasourceStartPlugins>,
    {
      fieldFormats: fieldFormatsSetup,
      expressions,
      editorFrame,
      charts,
    }: FormBasedDatasourceSetupPlugins
  ) {
    editorFrame.registerDatasource(async () => {
      const { getFormBasedDatasource, getSuffixFormatter, suffixFormatterId } = await import(
        '../../async_services'
      );

      if (!fieldFormatsSetup.has(suffixFormatterId)) {
        const startServices = createStartServicesGetter(core.getStartServices);
        const suffixFormatter = getSuffixFormatter(
          () => startServices().plugins.fieldFormats.deserialize
        );

        fieldFormatsSetup.register([suffixFormatter]);
      }

      const [
        coreStart,
        { dataViewFieldEditor, uiActions, data, fieldFormats, dataViews, unifiedSearch, share },
      ] = await core.getStartServices();

      return getFormBasedDatasource({
        core: coreStart,
        fieldFormats,
        storage: new Storage(localStorage),
        data,
        unifiedSearch,
        share,
        dataViews,
        charts,
        dataViewFieldEditor,
        uiActions,
      });
    });
  }
}
