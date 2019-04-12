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

import {
  embeddableFactories,
  EmbeddableFactory,
  EmbeddableInput,
} from 'plugins/embeddable_api/index';
import { HelloWorldEmbeddable } from './hello_world_embeddable';

export const HELLO_WORLD_EMBEDDABLE = 'hello_world';

export class HelloWorldEmbeddableFactory extends EmbeddableFactory {
  constructor() {
    super({
      name: HELLO_WORLD_EMBEDDABLE,
    });
  }

  public getOutputSpec() {
    return {};
  }

  public create(initialInput: EmbeddableInput) {
    return Promise.resolve(new HelloWorldEmbeddable(initialInput));
  }
}

embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
