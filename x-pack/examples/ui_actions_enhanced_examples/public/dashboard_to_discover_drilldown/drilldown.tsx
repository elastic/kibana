/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StartDependencies as Start } from '../plugin';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import { ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config_container';
import { SAMPLE_DASHBOARD_TO_DISCOVER_DRILLDOWN } from './constants';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../plugins/ui_actions_enhanced/public';
import { txtGoToDiscover } from './i18n';

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

export interface Params {
  start: StartServicesGetter<Pick<Start, 'data' | 'discover'>>;
}

export class DashboardToDiscoverDrilldown implements Drilldown<Config, ActionContext> {
  constructor(protected readonly params: Params) {}

  public readonly id = SAMPLE_DASHBOARD_TO_DISCOVER_DRILLDOWN;

  public readonly order = 10;

  public readonly getDisplayName = () => txtGoToDiscover;

  public readonly euiIcon = 'discoverApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = (props) => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

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
    const { urlGenerator } = this.params.start().plugins.discover;

    if (!urlGenerator) throw new Error('Discover URL generator not available.');

    let indexPatternId =
      !!config.customIndexPattern && !!config.indexPatternId ? config.indexPatternId : '';

    if (!indexPatternId && !!context.embeddable) {
      const output = context.embeddable!.getOutput();
      if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
        indexPatternId = output.indexPatterns[0].id;
      }
    }

    return await urlGenerator.createUrl({
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
