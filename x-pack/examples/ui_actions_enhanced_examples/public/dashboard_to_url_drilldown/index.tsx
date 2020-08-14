/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiFieldText, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../plugins/ui_actions_enhanced/public';
import { ChartActionContext } from '../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../src/plugins/kibana_utils/public';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../../../../src/plugins/ui_actions/public';
import { ActionExecutionContext } from '../../../../../src/plugins/ui_actions/public';

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export type ActionContext = ChartActionContext;

export interface Config {
  url: string;
  openInNewTab: boolean;
}

type UrlTrigger = typeof VALUE_CLICK_TRIGGER | typeof SELECT_RANGE_TRIGGER;

export type CollectConfigProps = CollectConfigPropsBase<Config, { triggers: UrlTrigger[] }>;

const SAMPLE_DASHBOARD_TO_URL_DRILLDOWN = 'SAMPLE_DASHBOARD_TO_URL_DRILLDOWN';

export class DashboardToUrlDrilldown implements Drilldown<Config, UrlTrigger> {
  public readonly id = SAMPLE_DASHBOARD_TO_URL_DRILLDOWN;

  public readonly order = 8;

  readonly minimalLicense = 'gold'; // example of minimal license support

  public readonly getDisplayName = () => 'Go to URL (example)';

  public readonly euiIcon = 'link';

  supportedTriggers(): UrlTrigger[] {
    return [VALUE_CLICK_TRIGGER, SELECT_RANGE_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => (
    <>
      <EuiCallOut title="Example warning!" color="warning" iconType="help">
        <p>
          This is an example drilldown. It is meant as a starting point for developers, so they can
          grab this code and get started. It does not provide a complete working functionality but
          serves as a getting started example.
        </p>
        <p>
          Implementation of the actual <em>Go to URL</em> drilldown is tracked in{' '}
          <a href="https://github.com/elastic/kibana/issues/55324">#55324</a>
        </p>
      </EuiCallOut>
      <EuiSpacer size="xl" />
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
      <EuiSpacer size="xl" />
      <EuiCallOut>
        {/* just demo how can access selected triggers*/}
        <p>Will be attached to triggers: {JSON.stringify(context.triggers)}</p>
      </EuiCallOut>
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
  public readonly getHref = async (config: Config, context: ActionContext) => {
    return config.url;
  };

  public readonly execute = async (
    config: Config,
    context: ActionExecutionContext<ActionContext>
  ) => {
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
