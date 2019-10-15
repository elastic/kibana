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
import ReactDOM from 'react-dom';
import { ISearchGeneric } from 'src/plugins/data/public';
import { fromExpression } from '@kbn/interpreter/common';
import { Adapters } from 'ui/inspector';
import {
  EmbeddableInput,
  Embeddable,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../../src/plugins/embeddable/public';
import { ExpressionInputComponent } from './expression_input_component';

import { getInterpreter } from '../../../../../../../src/legacy/core_plugins/interpreter/public/interpreter';
import { KibanaContext } from '../../../../../../../src/legacy/core_plugins/interpreter/public';

type getInitialContextFunction = () => KibanaContext;

export interface RunPipelineHandlers {
  getInitialContext: getInitialContextFunction;
  inspectorAdapters?: Adapters;
  abortSignal?: AbortSignal;
}

export const EXPRESSION_EMBEDDABLE = 'EXPRESSION_EMBEDDABLE';

export interface ExpressionEmbeddableInput extends EmbeddableInput {
  expression?: string;
}

export interface ExpressionEmbeddableOutput extends EmbeddableOutput {
  table?: any[];
}

export class ExpressionEmbeddable extends Embeddable<
  ExpressionEmbeddableInput,
  ExpressionEmbeddableOutput
> {
  public readonly type = EXPRESSION_EMBEDDABLE;
  private node?: Element;

  constructor(
    private search: ISearchGeneric,
    initialInput: ExpressionEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, { color: 'green' }, parent);

    this.getInput$().subscribe(() => {
      export const runPipeline = async (
        expression: string,
        context: any,
        handlers: RunPipelineHandlers
      ) => {
        const ast = fromExpression(expression);
        const { interpreter } = await getInterpreter();
        const pipelineResponse = await interpreter.interpretAst(ast, context, handlers as any);
        return pipelineResponse;
      };
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<ExpressionInputComponent embeddable={this} search={this.search} />, node);
  }

  public getTitle() {
    return `Expression`;
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
