/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../../plugins/ui_actions_enhanced/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import { SAMPLE_APP1_CLICK_TRIGGER, SampleApp1ClickContext } from '../../triggers';
import { SerializableState } from '../../../../../../src/plugins/kibana_utils/common';

export interface Config extends SerializableState {
  name: string;
}

type Trigger = typeof SAMPLE_APP1_CLICK_TRIGGER;
type Context = SampleApp1ClickContext;

export type CollectConfigProps = CollectConfigPropsBase<Config, { triggers: Trigger[] }>;

export const APP1_HELLO_WORLD_DRILLDOWN = 'APP1_HELLO_WORLD_DRILLDOWN';

export class App1HelloWorldDrilldown implements Drilldown<Config, Trigger> {
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
