/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../../plugins/ui_actions_enhanced/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import { ActionExecutionContext } from '../../../../../../src/plugins/ui_actions/public';
import { SAMPLE_ML_JOB_CLICK_TRIGGER, SampleMlJobClickContext } from '../../triggers';
import { SerializableState } from '../../../../../../src/plugins/kibana_utils/common';

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export interface Config extends SerializableState {
  url: string;
  openInNewTab: boolean;
}

type Trigger = typeof SAMPLE_ML_JOB_CLICK_TRIGGER;
type Context = SampleMlJobClickContext;

export type CollectConfigProps = CollectConfigPropsBase<Config, { triggers: Trigger[] }>;

export const SAMPLE_ML_TO_URL_DRILLDOWN = 'SAMPLE_ML_TO_URL_DRILLDOWN';

export class SampleMlToUrlDrilldown implements Drilldown<Config, Trigger> {
  public readonly id = SAMPLE_ML_TO_URL_DRILLDOWN;

  public readonly order = 8;

  public readonly getDisplayName = () => 'Go to URL';

  public readonly euiIcon = 'link';

  supportedTriggers(): Trigger[] {
    return [SAMPLE_ML_JOB_CLICK_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => (
    <>
      <EuiFormRow label="Enter target URL" fullWidth>
        <EuiFieldText
          fullWidth
          name="url"
          placeholder="Enter URL"
          value={config.url}
          onChange={(event) => onConfig({ ...config, url: event.target.value })}
          onBlur={() => {
            if (!config.url) return;
            if (/https?:\/\//.test(config.url)) return;
            onConfig({ ...config, url: 'https://' + config.url });
          }}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="openInNewTab"
          label="Open in new tab?"
          checked={config.openInNewTab}
          onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
        />
      </EuiFormRow>
    </>
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    url: '',
    openInNewTab: false,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.url) return false;
    return isValidUrl(config.url);
  };

  /**
   * `getHref` is need to support mouse middle-click and Cmd + Click behavior
   * to open a link in new tab.
   */
  public readonly getHref = async (config: Config, context: Context) => {
    return config.url;
  };

  public readonly execute = async (config: Config, context: ActionExecutionContext<Context>) => {
    // Just for showcasing:
    // we can get trigger a which caused this drilldown execution
    // eslint-disable-next-line no-console
    console.log(context.trigger?.id);

    const url = await this.getHref(config, context);

    if (config.openInNewTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };
}
