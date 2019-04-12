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
  Container,
  embeddableFactories,
  EmbeddableFactoryRegistry,
} from 'plugins/embeddable_api/index';
import React from 'react';
import { ListContainer } from '../embeddables/list_container';

interface Props {
  embeddableFactories: EmbeddableFactoryRegistry;
}

export class ListContainerExample extends React.Component<Props> {
  private root: React.RefObject<HTMLDivElement>;
  private container: Container;

  public constructor(props: Props) {
    super(props);

    this.root = React.createRef();
    this.container = new ListContainer(embeddableFactories);
  }

  public async componentDidMount() {
    if (this.root.current) {
      this.container.renderInPanel(this.root.current);
    }
  }

  public componentWillUnmount() {
    if (this.container) {
      this.container.destroy();
    }
  }
  public render() {
    return (
      <div className="app-container dshAppContainer">
        <h1>Custom Embeddable Container:</h1>
        <p>
          This is a custom container object, to show that visualize embeddables can be rendered
          outside of the dashboard container.
        </p>
        <div ref={this.root} />
      </div>
    );
  }
}
