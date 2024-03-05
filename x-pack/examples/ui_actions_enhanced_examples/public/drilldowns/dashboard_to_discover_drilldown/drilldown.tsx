/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '@kbn/ui-actions-enhanced-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { StartDependencies as Start } from '../../plugin';
import type { ActionApi, ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config_container';
import { SAMPLE_DASHBOARD_TO_DISCOVER_DRILLDOWN } from './constants';
import { txtGoToDiscover } from './i18n';

export interface Params {
  start: StartServicesGetter<Pick<Start, 'data' | 'discover'>>;
}

export class DashboardToDiscoverDrilldown
  implements Drilldown<Config, ApplyGlobalFilterActionContext>
{
  constructor(protected readonly params: Params) {}

  public readonly id = SAMPLE_DASHBOARD_TO_DISCOVER_DRILLDOWN;

  public readonly order = 10;

  public readonly getDisplayName = () => txtGoToDiscover;

  public readonly euiIcon = 'discoverApp';

  public supportedTriggers(): Array<typeof APPLY_FILTER_TRIGGER> {
    return [APPLY_FILTER_TRIGGER];
  }

  public readonly CollectConfig = (props: CollectConfigProps) => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly createConfig = () => ({
    customIndexPattern: false,
    carryFiltersAndQuery: true,
    carryTimeRange: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (config.customIndexPattern && !config.indexPatternId) return false;
    return true;
  };

  private readonly getPath = async (config: Config, context: ActionContext): Promise<string> => {
    const { locator } = this.params.start().plugins.discover;

    if (!locator) throw new Error('Discover locator not available.');

    let indexPatternId =
      !!config.customIndexPattern && !!config.indexPatternId ? config.indexPatternId : '';

    if (!indexPatternId) {
      const dataViews = (context?.embeddable as ActionApi).dataViews?.value;
      if (dataViews?.[0].id) {
        indexPatternId = dataViews[0].id;
      }
    }

    return await locator.getUrl({
      indexPatternId,
    });
  };

  public readonly getHref = async (config: Config, context: ActionContext): Promise<string> => {
    return `discover${await this.getPath(config, context)}`;
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const path = await this.getPath(config, context);

    await this.params.start().core.application.navigateToApp('discover', {
      path,
    });
  };
}
