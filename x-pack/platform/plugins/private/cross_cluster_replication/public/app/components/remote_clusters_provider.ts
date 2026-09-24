/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PureComponent, type ReactNode } from 'react';
import { loadRemoteClusters, type RemoteClusterRow } from '../services/api';
import type { CcrApiError } from '../services/http_error';
import { toCcrApiError } from '../services/http_error';

interface State {
  isLoading: boolean;
  error: CcrApiError | null;
  remoteClusters: RemoteClusterRow[];
}

interface Props {
  children: (params: {
    isLoading: boolean;
    error: CcrApiError | null;
    remoteClusters: RemoteClusterRow[];
  }) => ReactNode;
}

export class RemoteClustersProvider extends PureComponent<Props, State> {
  state: State = {
    isLoading: true,
    error: null,
    remoteClusters: [],
  };

  componentDidMount() {
    this.loadRemoteClusters();
  }

  loadRemoteClusters() {
    const sortClusterByName = (remoteClusters: RemoteClusterRow[]) =>
      remoteClusters.sort((a: RemoteClusterRow, b: RemoteClusterRow) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
    loadRemoteClusters()
      .then((clusters) => sortClusterByName(clusters))
      .then((remoteClusters) => {
        this.setState({
          isLoading: false,
          remoteClusters,
        });
      })
      .catch((error) => {
        this.setState({
          isLoading: false,
          error: toCcrApiError(error),
        });
      });
  }

  render() {
    const { children } = this.props;
    const { isLoading, error, remoteClusters } = this.state;

    return children({ isLoading, error, remoteClusters });
  }
}
