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
import {
  EmbeddableInput,
  Embeddable,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../../src/plugins/embeddable/public';
import { UsecaseInputComponent } from './usecase_input_component';
import { DataSourceEmbeddableOutput } from '../types';

export const USECASE_INPUT_EMBEDDABLE = 'USECASE_INPUT_EMBEDDABLE';

export interface UsecaseInputEmbeddableInput extends EmbeddableInput {
  indexPattern?: string;
}

export interface UsecaseInputEmbeddableOutput extends DataSourceEmbeddableOutput {
  indexPattern?: string;
}

export class UsecaseInputEmbeddable extends Embeddable<
  UsecaseInputEmbeddableInput,
  UsecaseInputEmbeddableOutput
> {
  public readonly type = USECASE_INPUT_EMBEDDABLE;
  private node?: Element;

  constructor(initialInput: UsecaseInputEmbeddableInput, parent?: IContainer) {
    super(initialInput, { color: '#C88B7E' }, parent);
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<UsecaseInputComponent embeddable={this} />, node);
  }

  public getTitle() {
    return `Select use case`;
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
