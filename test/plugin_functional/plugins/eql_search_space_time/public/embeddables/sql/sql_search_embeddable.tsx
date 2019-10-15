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
import { SqlInputComponent } from './sql_input_component';
import { DataSourceEmbeddableOutput } from '../types';

export const SQL_SEARCH_EMBEDDABLE = 'SQL_SEARCH_EMBEDDABLE';

export interface SqlSearchEmbeddableInput extends EmbeddableInput {
  sql?: string;
}

export interface SqlSearchEmbeddableOutput extends DataSourceEmbeddableOutput {
  sql?: string;
}

export class SqlSearchEmbeddable extends Embeddable<
  SqlSearchEmbeddableInput,
  SqlSearchEmbeddableOutput
> {
  public readonly type = SQL_SEARCH_EMBEDDABLE;
  private node?: Element;

  constructor(
    private search: ISearchGeneric,
    initialInput: SqlSearchEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, { color: 'green' }, parent);
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<SqlInputComponent embeddable={this} search={this.search} />, node);
  }

  public getTitle() {
    return `SQL`;
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
