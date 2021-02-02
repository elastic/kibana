/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiPageContentHeader } from '@elastic/eui';
import { first } from 'rxjs/operators';
import {
  IInterpreterRenderHandlers,
  ExpressionValue,
  TablesAdapter,
} from '../../../../../../../src/plugins/expressions/public';
import { RequestAdapter } from '../../../../../../../src/plugins/inspector/public';
import { Adapters, ExpressionRenderHandler } from '../../types';
import { getExpressions } from '../../services';

declare global {
  interface Window {
    runPipeline: (
      expressions: string,
      context?: ExpressionValue,
      initialContext?: ExpressionValue
    ) => any;
    renderPipelineResponse: (context?: ExpressionValue) => Promise<any>;
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
      context: ExpressionValue = {},
      initialContext: ExpressionValue = {}
    ) => {
      this.setState({ expression });
      const adapters: Adapters = {
        requests: new RequestAdapter(),
        tables: new TablesAdapter(),
      };
      return getExpressions()
        .execute(expression, context || { type: 'null' }, {
          inspectorAdapters: adapters,
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
        onRenderError: (el: HTMLElement, error: unknown, handler: IInterpreterRenderHandlers) => {
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
