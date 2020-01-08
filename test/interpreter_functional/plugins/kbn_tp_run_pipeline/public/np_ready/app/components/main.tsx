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
import { first } from 'rxjs/operators';
import {
  RequestAdapter,
  DataAdapter,
} from '../../../../../../../../src/plugins/inspector/public/adapters';
import {
  Adapters,
  Context,
  ExpressionRenderHandler,
  ExpressionDataHandler,
  RenderId,
} from '../../types';
import { getExpressions } from '../../services';

declare global {
  interface Window {
    runPipeline: (
      expressions: string,
      context?: Context,
      initialContext?: Context
    ) => ReturnType<ExpressionDataHandler['getData']>;
    renderPipelineResponse: (context?: Context) => Promise<RenderId>;
  }
}

interface State {
  expression: string;
}

class Main extends React.Component<{}, State> {
  chartRef = React.createRef<HTMLDivElement>();

  constructor(props: {}) {
    super(props);

    this.state = {
      expression: '',
    };

    window.runPipeline = async (
      expression: string,
      context: Context = {},
      initialContext: Context = {}
    ) => {
      this.setState({ expression });
      const adapters: Adapters = {
        requests: new RequestAdapter(),
        data: new DataAdapter(),
      };
      return getExpressions()
        .execute(expression, {
          inspectorAdapters: adapters,
          context,
          // TODO: naming / typing is confusing and doesn't match here
          // searchContext is also a way to set initialContext and Context can't be set to SearchContext
          searchContext: initialContext as any,
        })
        .getData();
    };

    let lastRenderHandler: ExpressionRenderHandler;
    window.renderPipelineResponse = async (context = {}) => {
      if (lastRenderHandler) {
        lastRenderHandler.destroy();
      }

      lastRenderHandler = getExpressions().render(this.chartRef.current!, context, {
        onRenderError: (el, error, handler) => {
          this.setState({
            expression: 'Render error!\n\n' + JSON.stringify(error),
          });
          handler.done();
        },
      });

      return lastRenderHandler.render$.pipe(first()).toPromise();
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
            <div data-test-subj="pluginChart" ref={this.chartRef} style={pStyle} />
            <div>{this.state.expression}</div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export { Main };
