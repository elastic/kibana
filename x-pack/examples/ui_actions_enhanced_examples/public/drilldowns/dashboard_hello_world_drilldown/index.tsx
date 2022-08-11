/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { reactToUiComponent } from '@kbn/kibana-react-plugin/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  ChartActionContext,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { CollectConfigProps } from '@kbn/kibana-utils-plugin/public';

export type ActionContext = ChartActionContext;

export type Config = {
  name: string;
};

const SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN = 'SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN';

export class DashboardHelloWorldDrilldown implements Drilldown<Config, ActionContext> {
  public readonly id = SAMPLE_DASHBOARD_HELLO_WORLD_DRILLDOWN;

  public readonly order = 6;

  public readonly getDisplayName = () => 'Say hello drilldown';

  public readonly euiIcon = 'cheer';

  supportedTriggers(): string[] {
    return [VALUE_CLICK_TRIGGER, SELECT_RANGE_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps<Config>> = ({
    config,
    onConfig,
    context,
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
