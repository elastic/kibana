/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiIsOfType,
  apiPublishesPartialUnifiedSearch,
  HasParentApi,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export const ACTION_EXPLORE_DATA_CHART = 'ACTION_EXPLORE_DATA_CHART';

export interface ExploreDataChartActionContext extends ApplyGlobalFilterActionContext {
  embeddable: Partial<PublishesUnifiedSearch> &
    Partial<HasParentApi<Partial<PublishesUnifiedSearch>>>;
}

/**
 * This is "Explore underlying data" action which appears in popup context
 * menu when user clicks a value in visualization or brushes a time range.
 */

export class ExploreDataChartAction
  extends AbstractExploreDataAction
  implements Action<ExploreDataChartActionContext>
{
  public readonly id = ACTION_EXPLORE_DATA_CHART;

  public readonly type = ACTION_EXPLORE_DATA_CHART;

  public readonly order = 200;

  public async isCompatible(context: ExploreDataChartActionContext): Promise<boolean> {
    const { embeddable } = context;
    if (apiIsOfType(embeddable, 'map')) {
      return false; // TODO: https://github.com/elastic/kibana/issues/73043
    }
    return apiPublishesPartialUnifiedSearch(embeddable) && super.isCompatible(context);
  }

  protected readonly getLocation = async (
    context: ExploreDataChartActionContext
  ): Promise<KibanaLocation> => {
    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters: filters, timeRange } = extractTimeRange(
      context.filters ?? [],
      context.timeFieldName
    );

    return super.getLocation(context, { filters, timeRange });
  };
}
