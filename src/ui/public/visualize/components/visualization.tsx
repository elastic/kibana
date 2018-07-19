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
import React from 'react';

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
  showNoResultsMessage: boolean;
}

export class Visualization extends React.Component<VisualizationProps, VisualizationState> {
  public static getDerivedStateFromProps(
    props: VisualizationProps,
    prevState: VisualizationState
  ): Partial<VisualizationState> | null {
    const uiStateChanged = props.uiState && props.uiState !== props.vis.getUiState();
    if (uiStateChanged) {
      throw new Error('Changing uiState props is not allowed!');
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
      showNoResultsMessage: shouldShowNoResultsMessage(vis, visData),
    };
  }

  public render() {
    const { vis, visData, onInit, uiState } = this.props;

    return (
      <div className="visualization">
        {this.state.showNoResultsMessage ? (
          <VisualizationNoResults onInit={onInit} />
        ) : (
          <VisualizationChart vis={vis} visData={visData} onInit={onInit} uiState={uiState} />
        )}
      </div>
    );
  }

  public componentWillUnmount() {
    this.props.uiState.off('change', this.onUiStateChanged);
  }

  public componentDidUpdate(prevProps: VisualizationProps) {
    const { listenOnChange } = this.props;
    // If the listenOnChange prop changed, we need to register or deregister from uiState
    if (prevProps.listenOnChange !== listenOnChange) {
      if (listenOnChange) {
        this.props.uiState.on('change', this.onUiStateChanged);
      } else {
        this.props.uiState.off('change', this.onUiStateChanged);
      }
    }
  }

  /**
   * In case something in the uiState changed, we need to force a redraw of
   * the visualization, since these changes could effect visualization rendering.
   */
  private onUiStateChanged() {
    this.forceUpdate();
  }
}
