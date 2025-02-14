/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';
import type { EditorFrameService } from '../../editor_frame_service';
import { ACTION_CREATE_ESQL_CHART } from './constants';
import { executeCreateAction, isCreateActionCompatible } from '../../async_services';

export class AddESQLPanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  public grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly core: CoreStart,
    protected readonly getEditorFrameService: () => Promise<EditorFrameService>
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.createVisualizationLabel', {
      defaultMessage: 'ES|QL',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'esqlVis';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiIsPresentationContainer(embeddable) && isCreateActionCompatible(this.core);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
    const editorFrameService = await this.getEditorFrameService();

    executeCreateAction({
      deps: this.startDependencies,
      core: this.core,
      api: embeddable,
      editorFrameService,
    });
  }
}
