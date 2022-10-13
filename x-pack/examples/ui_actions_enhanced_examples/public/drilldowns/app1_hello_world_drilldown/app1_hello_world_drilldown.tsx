/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { SerializableRecord } from '@kbn/utility-types';
import { reactToUiComponent } from '@kbn/kibana-react-plugin/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '@kbn/ui-actions-enhanced-plugin/public';
import { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import { SAMPLE_APP1_CLICK_TRIGGER, SampleApp1ClickContext } from '../../triggers';

export interface Config extends SerializableRecord {
  name: string;
}

type Trigger = typeof SAMPLE_APP1_CLICK_TRIGGER;
type Context = SampleApp1ClickContext;

export type CollectConfigProps = CollectConfigPropsBase<Config, { triggers: Trigger[] }>;

export const APP1_HELLO_WORLD_DRILLDOWN = 'APP1_HELLO_WORLD_DRILLDOWN';

export class App1HelloWorldDrilldown implements Drilldown<Config, Context> {
  public readonly id = APP1_HELLO_WORLD_DRILLDOWN;

  public readonly order = 8;

  public readonly getDisplayName = () => 'Hello world (app 1)';

  public readonly euiIcon = 'cheer';

  supportedTriggers(): Trigger[] {
    return [SAMPLE_APP1_CLICK_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
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

  public readonly execute = async (config: Config, context: Context) => {
    alert(`Hello, ${config.name}`);
  };
}
