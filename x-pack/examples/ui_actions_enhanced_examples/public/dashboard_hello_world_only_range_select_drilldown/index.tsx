/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../plugins/ui_actions_enhanced/public';
import { RangeSelectContext } from '../../../../../src/plugins/embeddable/public';
import { CollectConfigProps } from '../../../../../src/plugins/kibana_utils/public';
import { SELECT_RANGE_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import { BaseActionFactoryContext } from '../../../../plugins/ui_actions_enhanced/public/dynamic_actions';

export interface Config {
  name: string;
}

const SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN_ONLY_RANGE_SELECT =
  'SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN_ONLY_RANGE_SELECT';

export class DashboardHelloWorldOnlyRangeSelectDrilldown
  implements Drilldown<Config, typeof SELECT_RANGE_TRIGGER> {
  public readonly id = SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN_ONLY_RANGE_SELECT;

  public readonly order = 7;

  public readonly getDisplayName = () => 'Say hello only for range select';

  public readonly euiIcon = 'cheer';

  supportedTriggers(): Array<typeof SELECT_RANGE_TRIGGER> {
    return [SELECT_RANGE_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps<Config>> = ({
    config,
    onConfig,
  }) => (
    <EuiFormRow label="Enter your name" fullWidth>
      <EuiFieldText
        fullWidth
        value={config.name}
        onChange={(event) => onConfig({ ...config, name: event.target.value })}
      />
    </EuiFormRow>
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    name: '',
  });

  public readonly isConfigValid = (
    config: Config,
    context: BaseActionFactoryContext<typeof SELECT_RANGE_TRIGGER>
  ): config is Config => {
    // eslint-disable-next-line no-console
    console.log('Showcasing, that can access action factory context:', context);

    return !!config.name;
  };

  /**
   * Showcase isCompatible. Disabled drilldown action in case if range.length === 0
   */
  isCompatible(config: Config, context: RangeSelectContext): Promise<boolean> {
    if (context.data.range.length === 0) return Promise.resolve(false);
    return Promise.resolve(true);
  }

  public readonly execute = async (config: Config, context: RangeSelectContext) => {
    alert(`Hello, ${config.name}, your selected range: ${JSON.stringify(context.data.range)}`);
  };
}
