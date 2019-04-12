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
import { Container, EmbeddableFactoryRegistry } from 'plugins/embeddable_api/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { ListDisplay } from './list_display';

export const LIST_CONTAINER_ID = 'LIST_CONTAINER_ID';

export class ListContainer extends Container {
  constructor(embeddableFactories: EmbeddableFactoryRegistry) {
    // Seed the list with one embeddable to ensure it works.
    super(
      LIST_CONTAINER_ID,
      {
        id: '1234',
        panels: {
          myid: {
            initialInput: {},
            customization: {},
            embeddableId: 'myid',
            type: 'hello_world',
          },
        },
      },
      { embeddableLoaded: { myid: false } },
      embeddableFactories
    );
  }

  public render(node: HTMLElement) {
    ReactDOM.render(<ListDisplay container={this} />, node);
  }
}
