/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react'; // eslint-disable-line no-unused-vars
import { loadRemoteClusters } from '../services/api';

export class RemoteClustersProvider extends PureComponent {
  state = {
    isLoading: true,
    error: null,
    remoteClusters: [],
  };

  componentDidMount() {
    this.loadRemoteClusters();
  }

  loadRemoteClusters() {
    const sortClusterByName = remoteClusters =>
      remoteClusters.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
    loadRemoteClusters()
      .then(sortClusterByName)
      .then(remoteClusters => {
        this.setState({
          isLoading: false,
          remoteClusters,
        });
      })
      .catch(error => {
        this.setState({
          isLoading: false,
          error,
        });
      });
  }

  render() {
    const { children } = this.props;
    const { isLoading, error, remoteClusters } = this.state;

    return children({ isLoading, error, remoteClusters });
  }
}
