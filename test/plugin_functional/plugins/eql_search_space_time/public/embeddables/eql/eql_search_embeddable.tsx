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
  IEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';
import { EqlInputComponent } from './eql_input_component';
import { DataSourceEmbeddableOutput } from '../types';
import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../../common';

export const EQL_SEARCH_EMBEDDABLE = 'EQL_SEARCH_EMBEDDABLE';

export interface EqlSearchEmbeddableInput extends EmbeddableInput {
  eql?: string;
  targetIndexPattern?: string;
}

export interface EqlSearchEmbeddableOutput extends DataSourceEmbeddableOutput {
  eql?: string;
  indexPattern: string;
}

export class EqlSearchEmbeddable extends Embeddable<
  EqlSearchEmbeddableInput,
  EqlSearchEmbeddableOutput
> {
  public readonly type = EQL_SEARCH_EMBEDDABLE;
  private node?: Element;

  constructor(
    private search: ISearchGeneric,
    initialInput: EqlSearchEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, { color: '#C88B7E' }, parent);
    this.subscribeToChanges();
  }

  private subscribeToChanges() {
    this.getInput$().subscribe(async () => {
      if (this.input.eql !== this.output.eql && this.input.eql) {
        const siblingIds = Object.keys(this.parent!.getInput().panels);
        const siblings = [];
        for (let i = 0; i < siblingIds.length; i++) {
          await this.parent!.untilEmbeddableLoaded(siblingIds[i]);
          siblings.push(this.parent!.getChild(siblingIds[i]));
        }

        // TODO: here is (one place) where you might want to delete the old temp indices.

        if (!this.input.eql || this.input.eql === '') {
          this.updateOutput({
            indexPattern: undefined,
          });
          siblings.forEach(sibling => sibling.updateInput({ indexPattern: undefined }));
          return;
        }

        const indexPatternToSibling: { [key: string]: IEmbeddable[] } = {};
        siblings.forEach(sibling => {
          if (sibling.id === this.id) return;

          const indexPatterns = sibling.getOutput().indexPatterns;
          if (indexPatterns && indexPatterns.length === 1) {
            const indexPattern = indexPatterns[0].title;
            if (!indexPatternToSibling[indexPattern]) {
              indexPatternToSibling[indexPattern] = [];
            }
            indexPatternToSibling[indexPattern].push(sibling);
          }
        }, []);

        Object.keys(indexPatternToSibling).forEach(pattern => {
          this.search(
            { eql: this.input.eql || '', indexPattern: pattern },
            {},
            EQL_SEARCH_STRATEGY
          ).subscribe((results: IEqlSearchResponse) => {
            indexPatternToSibling[pattern].forEach(sibling => {
              sibling.updateInput({ indexPattern: results.index });
            });
          });
        });

        this.updateOutput({
          eql: this.input.eql,
        });
      }
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<EqlInputComponent embeddable={this} search={this.search} />, node);
  }

  public getTitle() {
    return `EQL`;
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
