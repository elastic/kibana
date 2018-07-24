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

import React from 'react';

interface VisualizationNoResultsProps {
  onInit?: () => void;
}

export class VisualizationNoResults extends React.Component<VisualizationNoResultsProps> {
  public render() {
    return (
      <div className="text-center visualize-error visualize-chart">
        <div className="item top" />
        <div className="item">
          <h2 aria-hidden="true">
            <i aria-hidden="true" className="fa fa-meh-o" />
          </h2>
          <h4>No results found</h4>
        </div>
        <div className="item bottom" />
      </div>
    );
  }

  public componentDidMount() {
    if (this.props.onInit) {
      this.props.onInit();
    }
  }

  public componentDidUpdate() {
    if (this.props.onInit) {
      this.props.onInit();
    }
  }
}
