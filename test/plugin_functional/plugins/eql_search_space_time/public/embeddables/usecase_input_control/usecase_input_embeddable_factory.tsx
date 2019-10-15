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
import { i18n } from '@kbn/i18n';
import { ISearchGeneric } from 'src/plugins/data/public';
import { EmbeddableFactory, IContainer } from '../../../../../../../src/plugins/embeddable/public';
import {
  UsecaseInputEmbeddable,
  UsecaseInputEmbeddableInput,
  USECASE_INPUT_EMBEDDABLE,
} from './usecase_input_embeddable';

export class UsecaseInputEmbeddableFactory extends EmbeddableFactory<UsecaseInputEmbeddableInput> {
  public readonly type = USECASE_INPUT_EMBEDDABLE;

  constructor() {
    super();
  }

  public isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.UsecaseInputEmbeddable.displayName', {
      defaultMessage: 'Use case filter',
    });
  }

  public async create(initialInput: UsecaseInputEmbeddableInput, parent?: IContainer) {
    return new UsecaseInputEmbeddable(initialInput, parent);
  }
}
