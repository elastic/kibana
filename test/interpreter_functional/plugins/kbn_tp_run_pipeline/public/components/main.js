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
import { EuiPage, EuiPageBody, EuiPageContent, EuiPageContentHeader } from '@elastic/eui';

class Main extends React.Component {
  chartDiv = React.createRef();
  exprDiv = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      expression: '',
    };

    window.runPipeline = async (expression, context = {}, initialContext = {}) => {
      this.setState({ expression });
      const adapters = {
        requests: new props.RequestAdapter(),
        data: new props.DataAdapter(),
      };
      return await props.runPipeline(expression, context, {
        inspectorAdapters: adapters,
        getInitialContext: () => initialContext,
      });
    };

    const handlers = {
      onDestroy: () => {
        return;
      },
    };

    window.renderPipelineResponse = async (context = {}) => {
      return new Promise(resolve => {
        if (context.type !== 'render') {
          this.setState({
            expression: 'Expression did not return render type!\n\n' + JSON.stringify(context),
          });
          return resolve();
        }
        const renderer = props.registries.renderers.get(context.as);
        if (!renderer) {
          this.setState({
            expression: 'Renderer was not found in registry!\n\n' + JSON.stringify(context),
          });
          return resolve();
        }
        props.visualizationLoader.destroy(this.chartDiv);
        const renderCompleteHandler = () => {
          resolve('render complete');
          this.chartDiv.removeEventListener('renderComplete', renderCompleteHandler);
        };
        this.chartDiv.addEventListener('renderComplete', renderCompleteHandler);
        renderer.render(this.chartDiv, context.value, handlers);
      });
    };
  }

  render() {
    const pStyle = {
      display: 'flex',
      width: '100%',
      height: '300px',
    };

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent data-test-subj="pluginContent">
            <EuiPageContentHeader>runPipeline tests are running ...</EuiPageContentHeader>
            <div data-test-subj="pluginChart" ref={ref => (this.chartDiv = ref)} style={pStyle} />
            <div>{this.state.expression}</div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export { Main };
