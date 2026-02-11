/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { LensApi } from '@kbn/lens-common-2';
import type { DrilldownDefinition } from '@kbn/embeddable-plugin/public';
import { apiIsOfType, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { DISCOVER_DRILLDOWN_SUPPORTED_TRIGGERS, DOC_TYPE } from '../../common/constants';
import { DiscoverDrilldownEditor } from './editor';
import type { DiscoverDrilldownState } from '../../server';
import type { DiscoverAppLocator } from '../trigger_actions/open_in_discover_helpers';
import { getHref, getLocation, isCompatible } from '../trigger_actions/open_in_discover_helpers';

export type ExecutionContext = ApplyGlobalFilterActionContext & {
  embeddable: LensApi;
};

export type SetupContext = EmbeddableApiContext;

export function getDiscoverDrilldown(deps: {
  locator: () => DiscoverAppLocator | undefined;
  dataViews: () => Pick<DataViewsService, 'get'>;
  hasDiscoverAccess: () => boolean;
  application: () => ApplicationStart;
}): DrilldownDefinition<DiscoverDrilldownState, ExecutionContext, SetupContext> {
  return {
    displayName: i18n.translate('xpack.lens.app.exploreDataInDiscoverDrilldown', {
      defaultMessage: 'Open in Discover',
    }),
    euiIcon: 'discoverApp',
    supportedTriggers: DISCOVER_DRILLDOWN_SUPPORTED_TRIGGERS,
    action: {
      execute: async (drilldownState: DiscoverDrilldownState, context: ExecutionContext) => {
        if (drilldownState.open_in_new_tab) {
          window.open(
            await getHref({
              locator: deps.locator(),
              dataViews: deps.dataViews(),
              hasDiscoverAccess: deps.hasDiscoverAccess(),
              ...context,
              embeddable: context.embeddable,
            }),
            '_blank'
          );
        } else {
          const { app, path, state } = await getLocation({
            locator: deps.locator(),
            dataViews: deps.dataViews(),
            hasDiscoverAccess: deps.hasDiscoverAccess(),
            ...context,
            embeddable: context.embeddable,
          });
          await deps.application().navigateToApp(app, { path, state });
        }
      },
      isCompatible: async (
        DrilldownState: DiscoverDrilldownState,
        { embeddable }: ExecutionContext
      ) => {
        return isCompatible({
          hasDiscoverAccess: deps.hasDiscoverAccess(),
          locator: deps.locator(),
          dataViews: deps.dataViews(),
          embeddable,
        });
      },
      getHref: (drilldownState: DiscoverDrilldownState, context: ExecutionContext) =>
        getHref({
          locator: deps.locator(),
          dataViews: deps.dataViews(),
          hasDiscoverAccess: deps.hasDiscoverAccess(),
          ...context,
          embeddable: context.embeddable,
        }),
    },
    setup: {
      Editor: DiscoverDrilldownEditor,
      getInitialState: () => ({
        open_in_new_tab: true,
      }),
      isCompatible: (context: SetupContext) =>
        deps.hasDiscoverAccess() && apiIsOfType(context.embeddable, DOC_TYPE),
      isStateValid: () => true,
      order: 8,
    },
  };
}
