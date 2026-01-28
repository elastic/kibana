/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce, findIndex } from 'lodash';
import type { CollectConfigProps } from '@kbn/kibana-utils-plugin/public';
import { DashboardDrilldownEditor } from './dashboard_drilldown_editor';
import { txtDestinationDashboardNotFound } from './i18n';
import type { DashboardDrilldownConfig } from '../types';
import type { Params } from '../abstract_dashboard_drilldown';

const mergeDashboards = (
  dashboards: Array<EuiComboBoxOptionOption<string>>,
  selectedDashboard?: EuiComboBoxOptionOption<string>
) => {
  // if we have a selected dashboard and its not in the list, append it
  if (selectedDashboard && findIndex(dashboards, { value: selectedDashboard.value }) === -1) {
    return [selectedDashboard, ...dashboards];
  }
  return dashboards;
};

const dashboardToMenuItem = (dashboardId: string, title: string) => ({
  value: dashboardId,
  label: title,
});

export interface DashboardDrilldownCollectConfigProps
  extends CollectConfigProps<DashboardDrilldownConfig, object> {
  params: Params;
}

interface CollectConfigContainerState {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  searchString?: string;
  isLoading: boolean;
  selectedDashboard?: EuiComboBoxOptionOption<string>;
  error?: string;
}

export class CollectConfigContainer extends React.Component<
  DashboardDrilldownCollectConfigProps,
  CollectConfigContainerState
> {
  private isMounted = true;
  state = {
    dashboards: [],
    isLoading: false,
    searchString: undefined,
    selectedDashboard: undefined,
    error: undefined,
  };

  constructor(props: DashboardDrilldownCollectConfigProps) {
    super(props);
    this.debouncedLoadDashboards = debounce(this.loadDashboards.bind(this), 500);
  }

  componentDidMount() {
    this.loadSelectedDashboard();
    this.loadDashboards();
  }

  componentWillUnmount() {
    this.isMounted = false;
  }

  render() {
    const { config, onConfig } = this.props;
    const { dashboards, selectedDashboard, isLoading, error } = this.state;

    return (
      <DashboardDrilldownEditor
        dashboards={mergeDashboards(dashboards, selectedDashboard)}
        isLoading={isLoading}
        error={error}
        onDashboardSelect={(dashboardId) => {
          onConfig({ ...config, dashboardId });
          if (this.state.error) {
            this.setState({ error: undefined });
          }
        }}
        onSearchChange={this.debouncedLoadDashboards}
        config={config}
        onConfigChange={(changes: Partial<DashboardDrilldownConfig>) => {
          onConfig({ ...config, ...changes });
        }}
      />
    );
  }

  private async loadSelectedDashboard() {
    const {
      config,
      params: { start },
    } = this.props;
    if (!config.dashboardId) return;
    const { dashboard } = await start().plugins;
    const findDashboardsService = await dashboard.findDashboardsService();
    const dashboardResponse = await findDashboardsService.findById(config.dashboardId);

    if (!this.isMounted) return;

    // handle case when destination dashboard no longer exists
    if (dashboardResponse.status === 'error' && dashboardResponse.notFound) {
      this.setState({
        error: txtDestinationDashboardNotFound(config.dashboardId),
      });
      this.props.onConfig({ ...config, dashboardId: undefined });
      return;
    }

    if (dashboardResponse.status === 'error') {
      this.setState({
        error: dashboardResponse.error.message,
      });
      this.props.onConfig({ ...config, dashboardId: undefined });
      return;
    }

    this.setState({
      selectedDashboard: dashboardToMenuItem(
        config.dashboardId,
        dashboardResponse.attributes.title
      ),
    });
  }

  private readonly debouncedLoadDashboards: (searchString?: string) => void;
  private async loadDashboards(searchString?: string) {
    this.setState({ searchString, isLoading: true });
    const { dashboard } = this.props.params.start().plugins;
    const findDashboardsService = await dashboard.findDashboardsService();
    const results = await findDashboardsService.search({
      search: searchString ?? '',
      per_page: 100,
    });

    // bail out if this response is no longer needed
    if (!this.isMounted) return;
    if (searchString !== this.state.searchString) return;

    const dashboardList = results.dashboards.map(({ id, data }) =>
      dashboardToMenuItem(id, data.title)
    );

    this.setState({ dashboards: dashboardList, isLoading: false });
  }
}
