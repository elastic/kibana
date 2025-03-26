/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { IMAGE_CLICK_TRIGGER } from '@kbn/image-embeddable-plugin/public';
import {
  AbstractDashboardDrilldown,
  AbstractDashboardDrilldownParams,
} from '../abstract_dashboard_drilldown';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN } from './constants';
import { createExtract, createInject } from '../../../../common';
import { AbstractDashboardDrilldownConfig as Config } from '../abstract_dashboard_drilldown';

export type Context = ApplyGlobalFilterActionContext & {
  embeddable: Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>;
};
export type Params = AbstractDashboardDrilldownParams;

/**
 * This drilldown is the "Go to Dashboard" you can find in Dashboard app panles.
 * This drilldown can be used on any embeddable and it is tied to embeddables
 * in two ways: (1) it works with APPLY_FILTER_TRIGGER, which is usually executed
 * by embeddables (but not necessarily); (2) its `getURL` method depends on
 * `embeddable` field being present in `context`.
 */
export class EmbeddableToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = EMBEDDABLE_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [APPLY_FILTER_TRIGGER, IMAGE_CLICK_TRIGGER];

  protected async getLocation(
    config: Config,
    context: Context,
    useUrlForState: boolean
  ): Promise<KibanaLocation> {
    const { getLocation } = await import('../async_module');
    return getLocation(this.locator, config, context, useUrlForState);
  }

  public readonly inject = createInject({ drilldownId: this.id });

  public readonly extract = createExtract({ drilldownId: this.id });
}
