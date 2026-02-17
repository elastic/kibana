/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { map } from 'rxjs';
import type { LensApi } from '@kbn/lens-common-2';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

export const getDiscoverHelpersAsync = async () => await import('../async_services');

export const createOpenInDiscoverAction = (
  locator: DiscoverAppLocator,
  dataViews: Pick<DataViewsService, 'get'>,
  hasDiscoverAccess: boolean
) => {
  const actionDefinition = {
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 20, // right before Inspect which is 19
    getIconType: () => 'discoverApp',
    getDisplayName: () =>
      i18n.translate('xpack.lens.action.exploreInDiscover', {
        defaultMessage: 'Explore in Discover',
      }),
    getHref: async (context: EmbeddableApiContext) => {
      const { getHref } = await getDiscoverHelpersAsync();
      return getHref({
        locator,
        dataViews,
        hasDiscoverAccess,
        ...context,
      });
    },
    isCompatible: async (context: EmbeddableApiContext) => {
      const { isCompatible } = await getDiscoverHelpersAsync();
      return isCompatible({
        hasDiscoverAccess,
        locator,
        dataViews,
        embeddable: context.embeddable,
      });
    },
    couldBecomeCompatible: ({ embeddable }: EmbeddableApiContext) => {
      if (!typeof (embeddable as LensApi).canViewUnderlyingData$)
        throw new IncompatibleActionError();
      return hasDiscoverAccess && Boolean((embeddable as LensApi).canViewUnderlyingData$);
    },
    getCompatibilityChangesSubject: ({ embeddable }: EmbeddableApiContext) => {
      if (!typeof (embeddable as LensApi).canViewUnderlyingData$) return;
      return (embeddable as LensApi).canViewUnderlyingData$.pipe(map(() => undefined));
    },
    execute: async (context: EmbeddableApiContext) => {
      const { execute } = await getDiscoverHelpersAsync();
      return execute({ ...context, locator, dataViews, hasDiscoverAccess });
    },
  };

  return createAction<EmbeddableApiContext>(actionDefinition);
};
