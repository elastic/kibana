/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { find } from 'lodash';
import { MonitoringViewBaseController } from '../../';
import { ElasticsearchOverview } from 'plugins/monitoring/components';
import { I18nContext } from 'ui/i18n';

export class ElasticsearchOverviewController extends MonitoringViewBaseController {
  constructor($injector, $scope) {
    // breadcrumbs + page title
    const $route = $injector.get('$route');
    const globalState = $injector.get('globalState');
    $scope.cluster = find($route.current.locals.clusters, {
      cluster_uuid: globalState.cluster_uuid
    });

    super({
      title: 'Elasticsearch',
      api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch`,
      defaultData: {
        clusterStatus: { status: '' },
        metrics: null,
        shardActivity: null
      },
      reactNodeId: 'elasticsearchOverviewReact',
      $scope,
      $injector
    });

    this.isCcrEnabled = $scope.cluster.isCcrEnabled;
    this.showShardActivityHistory = false;
    this.toggleShardActivityHistory = () => {
      this.showShardActivityHistory = !this.showShardActivityHistory;
      $scope.$evalAsync(() => {
        this.renderReact(this.data, $scope.cluster);
      });
    };

    this.initScope($scope);
  }

  initScope($scope) {
    $scope.$watch(() => this.data, data => {
      this.renderReact(data, $scope.cluster);
    });

    // HACK to force table to re-render even if data hasn't changed. This
    // happens when the data remains empty after turning on showHistory. The
    // button toggle needs to update the "no data" message based on the value of showHistory
    $scope.$watch(() => this.showShardActivityHistory, () => {
      const { data } = this;
      const dataWithShardActivityLoading = { ...data, shardActivity: null };
      // force shard activity to rerender by manipulating and then re-setting its data prop
      this.renderReact(dataWithShardActivityLoading, $scope.cluster);
      this.renderReact(data, $scope.cluster);
    });
  }

  filterShardActivityData(shardActivity) {
    return shardActivity.filter(row => {
      return this.showShardActivityHistory || row.stage !== 'DONE';
    });
  }

  renderReact(data, cluster) {
    // All data needs to originate in this view, and get passed as a prop to the components, for statelessness
    const { clusterStatus, metrics, shardActivity, logs } = data;
    const shardActivityData = shardActivity && this.filterShardActivityData(shardActivity); // no filter on data = null
    const component = (
      <I18nContext>
        <ElasticsearchOverview
          clusterStatus={clusterStatus}
          metrics={metrics}
          logs={logs}
          cluster={cluster}
          shardActivity={shardActivityData}
          onBrush={this.onBrush}
          showShardActivityHistory={this.showShardActivityHistory}
          toggleShardActivityHistory={this.toggleShardActivityHistory}
        />
      </I18nContext>
    );

    super.renderReact(component);
  }
}
