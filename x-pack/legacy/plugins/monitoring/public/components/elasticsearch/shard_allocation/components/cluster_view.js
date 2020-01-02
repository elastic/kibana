/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { TableHead } from './table_head';
import { TableBody } from './table_body';
import { i18n } from '@kbn/i18n';

export class ClusterView extends React.Component {
  static displayName = i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.clusterViewDisplayName', {
    defaultMessage: 'ClusterView',
  });

  constructor(props) {
    super(props);
    const scope = props.scope;
    const kbnChangePath = props.kbnUrl.changePath;

    this.state = {
      labels: props.scope.labels || [],
      showing: props.scope.showing || [],
      shardStats: props.scope.pageData.shardStats,
      showSystemIndices: props.showSystemIndices,
      toggleShowSystemIndices: props.toggleShowSystemIndices,
      angularChangeUrl: (url) => {
        scope.$evalAsync(() => kbnChangePath(url));
      }
    };
  }

  setShowing = (data) => {
    if (data) {
      this.setState({ showing: data });
    }
  };

  setShardStats = (stats) => {
    this.setState({ shardStats: stats });
  };

  UNSAFE_componentWillMount() {
    this.props.scope.$watch('showing', this.setShowing);
    this.props.scope.$watch(() => this.props.scope.pageData.shardStats, this.setShardStats);
  }

  hasUnassigned = () => {
    return this.state.showing.length &&
      this.state.showing[0].unassigned &&
      this.state.showing[0].unassigned.length;
  };

  render() {
    return (
      <table cellPadding="0" cellSpacing="0" className="table">
        <TableHead
          hasUnassigned={this.hasUnassigned()}
          scope={this.props.scope}
          toggleShowSystemIndices={this.state.toggleShowSystemIndices}
        />
        <TableBody
          filter={this.props.scope.filter}
          totalCount={this.props.scope.totalCount}
          rows={this.state.showing}
          cols={this.state.labels.length}
          shardStats={this.state.shardStats}
          changeUrl={this.state.angularChangeUrl}
        />
      </table>
    );
  }
}
