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
import { Subscription } from 'rxjs';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import {
  EmbeddablePanel,
  GetEmbeddableFactory,
  GetEmbeddableFactories,
} from '../../../../../../../../src/plugins/embeddable/public';
import {
  HelloWorldContainer,
  CONTACT_CARD_EMBEDDABLE,
  HELLO_WORLD_EMBEDDABLE_TYPE,
} from '../../../../../../../../src/plugins/embeddable/public/lib/test_samples';
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

export class HelloWorldContainerExample extends React.Component<Props, { lastName?: string }> {
  private container: HelloWorldContainer;
  private mounted: boolean = false;
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);

    this.container = new HelloWorldContainer(
      {
        id: 'helloWorldContainerExample',
        panels: {
          '1': {
            type: CONTACT_CARD_EMBEDDABLE,
            explicitInput: {
              firstName: 'Joe',
              id: '1',
            },
          },
          '2': {
            type: HELLO_WORLD_EMBEDDABLE_TYPE,
            explicitInput: { id: '2' },
          },
          '3': {
            type: 'idontexist',
            explicitInput: { id: '3' },
          },
        },
      },
      {
        getActions: this.props.getActions,
        getEmbeddableFactory: this.props.getEmbeddableFactory,
        getAllEmbeddableFactories: this.props.getAllEmbeddableFactories,
        overlays: this.props.overlays,
        notifications: this.props.notifications,
        inspector: this.props.inspector,
        SavedObjectFinder: this.props.SavedObjectFinder,
      }
    );
    this.state = {
      lastName: this.container.getInput().lastName,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    this.subscription = this.container.getInput$().subscribe(() => {
      const { lastName } = this.container.getInput();
      if (this.mounted) {
        this.setState({
          lastName,
        });
      }
    });
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.container.destroy();
  }

  public render() {
    return (
      <div className="app-container dshAppContainer">
        <h1>Hello World Container</h1>
        <EuiFormRow label="Last name">
          <EuiFieldText
            name="popfirst"
            value={this.state.lastName}
            placeholder="optional"
            onChange={e => this.container.updateInput({ lastName: e.target.value })}
          />
        </EuiFormRow>
        <EmbeddablePanel
          embeddable={this.container}
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
