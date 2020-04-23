/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiFieldText } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../src/plugins/kibana_react/public';
import { DrilldownDefinition as Drilldown } from '../../../../plugins/drilldowns/public';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import {
  EmbeddableContext,
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../src/plugins/embeddable/public';
import { UiActionsCollectConfigProps } from '../../../../../src/plugins/ui_actions/public';
import { StartDependencies } from '../plugin';

export type PlaceContext = EmbeddableContext;
export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;

export interface Config {
  url: string;
  openInNewTab: boolean;
}

export type CollectConfigProps = UiActionsCollectConfigProps<Config>;

const SAMPLE_DASHBOARD_TO_URL_DRILLDOWN = 'SAMPLE_DASHBOARD_TO_URL_DRILLDOWN';

export interface Params {
  start: StartServicesGetter<Pick<StartDependencies, 'data'>>;
}

export class DashboardToUrlDrilldown implements Drilldown<Config, PlaceContext, ActionContext> {
  constructor(protected readonly params: Params) {}

  public readonly id = SAMPLE_DASHBOARD_TO_URL_DRILLDOWN;

  public readonly order = 25;

  public readonly getDisplayName = () => 'Go to URL';

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

  public readonly execute = async (config: Config, context: ActionContext) => {
    window.location.href = config.url;
  };
}
