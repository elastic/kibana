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
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { ACTION_CREATE_ESQL_CHART } from './constants';
import { generateId } from '../../id_generator';
import type { LensApi } from '../../react_embeddable/types';

export class AddESQLPanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  public grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(protected readonly core: CoreStart) {}

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
    return apiIsPresentationContainer(embeddable) && this.core.uiSettings.get(ENABLE_ESQL);
  }

  public async execute({ embeddable: api }: EmbeddableApiContext) {
    if (!apiIsPresentationContainer(api)) throw new IncompatibleActionError();
    const embeddable = await api.addNewPanel<object, LensApi>({
      panelType: 'lens',
      serializedState: {
        rawState: {
          id: generateId(),
          isNewPanel: true,
          attributes: { references: [] },
        },
      },
    });
    // open the flyout if embeddable has been created successfully
    embeddable?.onEdit?.();
  }
}
