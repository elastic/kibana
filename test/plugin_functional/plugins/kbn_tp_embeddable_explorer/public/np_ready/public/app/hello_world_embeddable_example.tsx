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
import {
  EmbeddablePanel,
  GetEmbeddableFactory,
  GetEmbeddableFactories,
} from '../../../../../../../../src/plugins/embeddable/public';
import { HelloWorldEmbeddable } from '../../../../../../../../src/plugins/embeddable/public/lib/test_samples';
import { TGetActionsCompatibleWithTrigger } from '../../../../../../../../src/plugins/ui_actions/public';
import { CoreStart } from '../../../../../../../../src/core/public';
import { Start as InspectorStartContract } from '../../../../../../../../src/plugins/inspector/public';

interface Props {
  getActions: TGetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
}

export class ContactCardEmbeddableExample extends React.Component<Props> {
  private embeddable: HelloWorldEmbeddable;

  constructor(props: Props) {
    super(props);

    this.embeddable = new HelloWorldEmbeddable({ id: 'hello' });
  }

  public componentWillUnmount() {
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  public render() {
    return (
      <div className="app-container dshAppContainer">
        <EmbeddablePanel
          embeddable={this.embeddable}
          getActions={this.props.getActions}
          getEmbeddableFactory={this.props.getEmbeddableFactory}
          getAllEmbeddableFactories={this.props.getAllEmbeddableFactories}
          overlays={this.props.overlays}
          notifications={this.props.notifications}
          inspector={this.props.inspector}
          SavedObjectFinder={this.props.SavedObjectFinder}
        />
      </div>
    );
  }
}
