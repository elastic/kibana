/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { DOC_TYPE as LENS_DOC_TYPE } from '@kbn/lens-plugin/common/constants';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiIsOfType,
  apiPublishesDataViews,
  apiPublishesPartialUnifiedSearch,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasType,
  PublishesDataViews,
} from '@kbn/presentation-publishing';
import { KibanaLocation } from '@kbn/share-plugin/public';

import * as shared from './shared';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

export interface PluginDeps {
  discover: Pick<DiscoverStart, 'locator'>;
}

export interface CoreDeps {
  application: Pick<CoreStart['application'], 'navigateToApp' | 'getUrlForApp'>;
}

export interface Params {
  start: StartServicesGetter<PluginDeps, unknown, CoreDeps>;
}

type AbstractExploreDataActionApi = CanAccessViewMode & HasType & PublishesDataViews;

const isApiCompatible = (api: unknown | null): api is AbstractExploreDataActionApi =>
  apiCanAccessViewMode(api) && apiHasType(api) && apiPublishesDataViews(api);

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  return (
    isApiCompatible(api) &&
    getInheritedViewMode(api) === ViewMode.VIEW &&
    !apiIsOfType(api, LENS_DOC_TYPE)
  );
};

export abstract class AbstractExploreDataAction {
  public readonly getIconType = (): string => 'discoverApp';

  public readonly getDisplayName = (): string =>
    i18n.translate('xpack.discover.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Explore underlying data',
    });

  constructor(protected readonly params: Params) {}

  protected async getLocation(
    { embeddable }: EmbeddableApiContext,
    eventParams?: DiscoverAppLocatorParams
  ): Promise<KibanaLocation> {
    const { plugins } = this.params.start();
    const { locator } = plugins.discover;

    if (!locator) {
      throw new Error('Discover URL locator not available.');
    }

    const parentParams: DiscoverAppLocatorParams = {};
    if (apiHasParentApi(embeddable) && apiPublishesPartialUnifiedSearch(embeddable.parentApi)) {
      parentParams.filters = embeddable.parentApi.filters$?.getValue() ?? [];
      parentParams.query = embeddable.parentApi.query$?.getValue();
      parentParams.timeRange = embeddable.parentApi.timeRange$?.getValue();
    }

    const childParams: DiscoverAppLocatorParams = {};
    if (apiPublishesPartialUnifiedSearch(embeddable)) {
      childParams.filters = embeddable.filters$?.getValue() ?? [];
      childParams.query = embeddable.query$?.getValue();
      childParams.timeRange = embeddable.timeRange$?.getValue();
    }

    const params: DiscoverAppLocatorParams = {
      dataViewId: shared.getDataViews(embeddable)[0],
      filters: [
        // combine filters from all possible sources
        ...(parentParams.filters ?? []),
        ...(childParams.filters ?? []),
        ...(eventParams?.filters ?? []),
      ],
      query: parentParams.query ?? childParams.query, // overwrite the child query with the parent query
      // prioritize event time range for chart action; otherwise, overwrite the parent time range with the child's
      timeRange: eventParams?.timeRange ?? childParams.timeRange ?? parentParams.timeRange,
    };

    const location = await locator.getLocation(params);
    return location;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    if (!compatibilityCheck(embeddable)) return false;

    const { core, plugins } = this.params.start();
    const { capabilities } = core.application;

    if (capabilities.discover_v2 && !capabilities.discover_v2.show) return false;
    if (!plugins.discover.locator) return false;

    return shared.hasExactlyOneDataView(embeddable);
  }

  public async execute(api: EmbeddableApiContext): Promise<void> {
    const { embeddable } = api;
    if (!this.isCompatible({ embeddable })) return;

    const { core } = this.params.start();
    const { app, path } = await this.getLocation(api);

    await core.application.navigateToApp(app, {
      path,
    });
  }

  public async getHref(api: EmbeddableApiContext): Promise<string> {
    const { embeddable } = api;

    if (!this.isCompatible({ embeddable })) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { core } = this.params.start();
    const { app, path } = await this.getLocation(api);
    const url = core.application.getUrlForApp(app, { path, absolute: false });

    return url;
  }
}
