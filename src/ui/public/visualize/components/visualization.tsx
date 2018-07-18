/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import React, { Component } from 'react';

import { PersistedState } from '../../persisted_state';
import { Vis } from '../../vis';
import { VisualizationChart } from './visualization_chart';
import { VisualizationNoResults } from './visualization_noresults';

import './visualization.less';

function shouldShowNoResultsMessage(vis: Vis, visData: any): boolean {
  const requiresSearch = get(vis, 'type.requiresSearch');
  const isZeroHits = get(visData, 'hits.total') === 0;
  const shouldShowMessage = !get(vis, 'params.handleNoResults');

  return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
}

interface VisualizationProps {
  listenOnChange: boolean;
  onInit?: () => void;
  uiState: PersistedState;
  vis: Vis;
  visData: any;
}

interface VisualizationState {
  listenOnChange: boolean;
  showNoResultsMessage: boolean;
}

export class Visualization extends Component<VisualizationProps, VisualizationState> {
  public static getDerivedStateFromProps(
    props: VisualizationProps,
    prevState: VisualizationState
  ): Partial<VisualizationState> | null {
    const listenOnChangeChanged = props.listenOnChange !== prevState.listenOnChange;
    const uiStateChanged = props.uiState && props.uiState !== props.vis.getUiState();
    if (listenOnChangeChanged || uiStateChanged) {
      throw new Error('Changing listenOnChange or uiState props is not allowed!');
    }

    const showNoResultsMessage = shouldShowNoResultsMessage(props.vis, props.visData);
    if (prevState.showNoResultsMessage !== showNoResultsMessage) {
      return { showNoResultsMessage };
    }
    return null;
  }

  constructor(props: VisualizationProps) {
    super(props);

    const { vis, visData, uiState, listenOnChange } = props;

    vis._setUiState(props.uiState);
    if (listenOnChange) {
      uiState.on('change', this.onUiStateChanged);
    }

    this.state = {
      listenOnChange,
      showNoResultsMessage: shouldShowNoResultsMessage(vis, visData),
    };
  }

  public render() {
    const { vis, visData, onInit, uiState } = this.props;

    return (
      <div className="visualization">
        {this.state.showNoResultsMessage ? (
          <VisualizationNoResults />
        ) : (
          <VisualizationChart vis={vis} visData={visData} onInit={onInit} uiState={uiState} />
        )}
      </div>
    );
  }

  public componentWillUnmount() {
    this.props.uiState.off('change', this.onUiStateChanged);
  }

  /**
   * In case something in the uiState changed, we need to force a redraw of
   * the visualization, since these changes could effect visualization rendering.
   */
  private onUiStateChanged() {
    this.forceUpdate();
  }
}
