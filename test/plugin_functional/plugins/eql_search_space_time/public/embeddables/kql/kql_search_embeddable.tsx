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
import { KqlInputComponent } from './kql_input_component';
import { DataSourceEmbeddableOutput } from '../types';

export const KQL_SEARCH_EMBEDDABLE = 'KQL_SEARCH_EMBEDDABLE';

export interface KqlSearchEmbeddableInput extends EmbeddableInput {
  kql?: string;
}

export interface KqlSearchEmbeddableOutput extends DataSourceEmbeddableOutput {
  kql?: string;
}

export class KqlSearchEmbeddable extends Embeddable<
  KqlSearchEmbeddableInput,
  KqlSearchEmbeddableOutput
> {
  public readonly type = KQL_SEARCH_EMBEDDABLE;
  private node?: Element;

  constructor(
    private search: ISearchGeneric,
    initialInput: KqlSearchEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, { color: 'yellow' }, parent);
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<KqlInputComponent embeddable={this} search={this.search} />, node);
  }

  public getTitle() {
    return `KQL`;
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
