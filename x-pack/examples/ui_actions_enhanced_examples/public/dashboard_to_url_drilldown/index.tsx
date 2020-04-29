/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiFieldText } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../plugins/advanced_ui_actions/public';
import {
  EmbeddableContext,
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../src/plugins/kibana_utils/public';

export type PlaceContext = EmbeddableContext;
export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;

export interface Config {
  url: string;
  openInNewTab: boolean;
}

export type CollectConfigProps = CollectConfigPropsBase<Config>;

const SAMPLE_DASHBOARD_TO_URL_DRILLDOWN = 'SAMPLE_DASHBOARD_TO_URL_DRILLDOWN';

export class DashboardToUrlDrilldown implements Drilldown<Config, PlaceContext, ActionContext> {
  public readonly id = SAMPLE_DASHBOARD_TO_URL_DRILLDOWN;

  public readonly order = 8;

  public readonly getDisplayName = () => 'Go to URL (example)';

  public readonly euiIcon = 'link';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({ config, onConfig }) => (
    <>
      <EuiFormRow label="Enter target URL" fullWidth>
        <EuiFieldText
          fullWidth
          placeholder="Enter URL"
          name="url"
          value={config.url}
          onChange={event => onConfig({ ...config, url: event.target.value })}
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
    return !!config.url && typeof config.url === 'string';
  };

  /**
   * `getHref` is need to support mouse middle-click and Cmd + Click behavior
   * to open a link in new tab.
   */
  public readonly getHref = async (config: Config, context: ActionContext) => {
    return config.url;
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const url = await this.getHref(config, context);

    if (config.openInNewTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };
}
