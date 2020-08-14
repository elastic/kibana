/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../plugins/ui_actions_enhanced/public';
import { ChartActionContext } from '../../../../../src/plugins/embeddable/public';
import { CollectConfigProps } from '../../../../../src/plugins/kibana_utils/public';

export type ActionContext = ChartActionContext;

export interface Config {
  name: string;
}

const SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN = 'SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN';

export class DashboardHelloWorldDrilldown implements Drilldown<Config, ActionContext> {
  public readonly id = SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN;

  public readonly order = 6;

  public readonly getDisplayName = () => 'Say hello drilldown';

  public readonly euiIcon = 'cheer';

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

  public readonly isConfigValid = (config: Config): config is Config => {
    return !!config.name;
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    alert(`Hello, ${config.name}`);
  };
}
