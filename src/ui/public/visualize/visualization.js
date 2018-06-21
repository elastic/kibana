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

import './visualize.less';
import _ from 'lodash';
import React, { Component } from 'react';
import { VisualizationNoResults, VisualizationChart } from './components';

const _showNoResultsMessage = (vis, visData) => {
  const requiresSearch = _.get(vis, 'type.requiresSearch');
  const isZeroHits = _.get(visData, 'hits.total') === 0;
  const shouldShowMessage = !_.get(vis, 'params.handleNoResults');

  return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
};

export class Visualization extends Component {
  constructor(props) {
    super(props);

    const { vis, visData, uiState, listenOnChange } = props;
    vis.initialized = true;

    vis._setUiState(props.uiState);
    if (listenOnChange) {
      uiState.on('change', this._onChangeListener);
    }

    this.state = {
      listenOnChange: listenOnChange,
      showNoResultsMessage: _showNoResultsMessage(vis, visData)
    };
  }

  render() {
    const { vis, visData, listenOnChange } = this.props;
    return (
      <div className="visualization">
        {this.state.showNoResultsMessage ? (<VisualizationNoResults />) :
          (<VisualizationChart
            vis={vis}
            visData={visData}
            listenOnChange={listenOnChange}
          />)
        }
      </div>
    );
  }

  _onChangeListener = () => {
    this.forceUpdate();
  };

  static getDerivedStateFromProps(props, prevState) {
    const listenOnChangeChanged = props.hasOwnProperty('listenOnChange') && props.listenOnChange !== prevState.listenOnChange;
    const uiStateChanged = props.uiState && props.uiState !== props.vis.getUiState();
    if (listenOnChangeChanged || uiStateChanged) {
      throw new Error('Changing listenOnChange or uiState props is not allowed!');
    }

    const showNoResultsMessage = _showNoResultsMessage(props.vis, props.visData);
    if (prevState.showNoResultsMessage !== showNoResultsMessage) {
      return { showNoResultsMessage };
    }
    return null;
  }

  componentWillUnmount() {
    this.props.uiState.off('change', this._onChangeListener);
  }
}
