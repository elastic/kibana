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
  GetActionsCompatibleWithTrigger,
  GetEmbeddableFactory,
  GetEmbeddableFactories,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
//@ts-ignore
import { MapEmbeddableFactory } from '../../../../../../x-pack/legacy/plugins/maps/public/embeddable/map_embeddable_factory';
import { CoreStart } from '../../../../../../src/core/public';
import { Start as InspectorStartContract } from '../../../../../../src/plugins/inspector/public';

interface Props {
  getActions: GetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
}

export class MapEmbeddableExample extends React.Component<Props, { embeddable?: any }> {
  // private embeddable: MapEmbeddable;

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  public componentWillUnmount() {
    if (this.state.embeddable) {
      this.state.embeddable.destroy();
    }
  }

  public componentDidMount() {
    new MapEmbeddableFactory()
      .createFromSavedObject(
        'b9eaf720-c3a3-11e9-b3b7-590b5cc2c172',
        { isLayerTOCOpen: false },
        null
      )
      .then((embeddable: any) => {
        this.setState({
          embeddable,
        });
        const query = {
          query: 'service.name:"client"  and transaction.type : "page-load"',
          language: 'kuery',
        };
        // embeddable.updateInput({ query });

        const timeRange = {
          from: new Date('2019-08-14T16:44:22.021Z').toISOString(),
          to: new Date('2019-08-21T16:44:22.021Z').toISOString(),
        };

        embeddable.updateInput({ timeRange, query });
      });
  }

  public render() {
    return (
      <div className="app-container dshAppContainer">
        {this.state.embeddable ? (
          <EmbeddablePanel
            embeddable={this.state.embeddable}
            getActions={this.props.getActions}
            getEmbeddableFactory={this.props.getEmbeddableFactory}
            getAllEmbeddableFactories={this.props.getAllEmbeddableFactories}
            overlays={this.props.overlays}
            notifications={this.props.notifications}
            inspector={this.props.inspector}
            SavedObjectFinder={this.props.SavedObjectFinder}
          />
        ) : null}
      </div>
    );
  }
}
