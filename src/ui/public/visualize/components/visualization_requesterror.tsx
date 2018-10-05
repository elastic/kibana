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

import { EuiText } from '@elastic/eui';
import React from 'react';
import { SearchError } from 'ui/courier';
import { dispatchRenderComplete } from '../../render_complete';

interface VisualizationRequestErrorProps {
  onInit?: () => void;
  error: SearchError | string;
}

export class VisualizationRequestError extends React.Component<VisualizationRequestErrorProps> {
  private containerDiv = React.createRef<HTMLDivElement>();

  public render() {
    const { error } = this.props;
    const errorMessage = (error && error.message) || error;

    return (
      <div className="visualize-error visualize-chart" ref={this.containerDiv}>
        <EuiText className="visualize-request-error" color="danger" size="xs">
          {errorMessage}
        </EuiText>
      </div>
    );
  }

  public componentDidMount() {
    this.afterRender();
  }

  public componentDidUpdate() {
    this.afterRender();
  }

  private afterRender() {
    if (this.props.onInit) {
      this.props.onInit();
    }
    if (this.containerDiv.current) {
      dispatchRenderComplete(this.containerDiv.current);
    }
  }
}
