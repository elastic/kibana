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
import { Container, Embeddable } from 'plugins/embeddable_api/index';
import React, { Component, Ref, RefObject } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  container: Container;
}

interface State {
  embeddables: { [key: string]: Embeddable };
  loaded: { [key: string]: boolean };
}

export class ListDisplay extends Component<Props, State> {
  private roots: { [key: string]: RefObject<HTMLDivElement> } = {};
  private mounted: boolean = false;
  private inputSubscription?: Subscription;
  private outputSubscription?: Subscription;

  public constructor(props: Props) {
    super(props);

    Object.values(this.props.container.getInput().panels).forEach(panelState => {
      this.roots[panelState.embeddableId] = React.createRef();
    });
    this.state = {
      loaded: {},
      embeddables: {},
    };
  }

  public async componentDidMount() {
    this.mounted = true;

    Object.values(this.props.container.getInput().panels).forEach(panelState => {
      this.renderEmbeddable(panelState.embeddableId);
    });

    this.inputSubscription = this.props.container.getInput$().subscribe(input => {
      Object.values(input.panels).forEach(async panelState => {
        if (this.roots[panelState.embeddableId] === undefined) {
          this.roots[panelState.embeddableId] = React.createRef();
        }

        if (this.state.embeddables[panelState.embeddableId] === undefined) {
          const embeddable = await this.props.container.getEmbeddable(panelState.embeddableId);
          const node = this.roots[panelState.embeddableId].current;
          if (this.mounted && node !== null && embeddable) {
            embeddable.renderInPanel(node, this.props.container);

            this.setState(prevState => ({
              loaded: { ...prevState.loaded, [panelState.embeddableId]: true },
            }));
          }
        }
      });
    });

    this.outputSubscription = this.props.container.getOutput$().subscribe(output => {
      const embeddablesLoaded = output.embeddableLoaded;
      Object.keys(embeddablesLoaded).forEach(async id => {
        const loaded = embeddablesLoaded[id];
        if (loaded && !this.state.loaded[id]) {
          const embeddable = await this.props.container.getEmbeddable(id);
          const node = this.roots[id].current;
          if (this.mounted && node !== null && embeddable) {
            embeddable.renderInPanel(node);
            this.setState({ loaded: embeddablesLoaded });
          }
        }
      });
    });
  }

  public componentWillUnmount() {
    this.props.container.destroy();

    if (this.inputSubscription) {
      this.inputSubscription.unsubscribe();
    }
    if (this.outputSubscription) {
      this.outputSubscription.unsubscribe();
    }
  }

  public renderList() {
    const list = Object.values(this.props.container.getInput().panels).map(panelState => {
      const item = (
        <EuiFlexItem key={panelState.embeddableId}>
          <div style={{ height: '400px' }} ref={this.roots[panelState.embeddableId]} />
        </EuiFlexItem>
      );
      return item;
    });
    return list;
  }

  public render() {
    return (
      <div>
        <h2>A list of Embeddables!</h2>
        <EuiFlexGroup>{this.renderList()}</EuiFlexGroup>
      </div>
    );
  }

  private async renderEmbeddable(id: string) {
    if (this.state.embeddables[id] !== undefined) {
      return;
    }

    if (this.roots[id] === undefined) {
      this.roots[id] = React.createRef();
    }

    if (this.state.embeddables[id] === undefined) {
      const embeddable = await this.props.container.getEmbeddable(id);
      const node = this.roots[id].current;
      if (this.mounted && node !== null && embeddable) {
        embeddable.renderInPanel(node);

        this.setState(prevState => ({
          loaded: { ...prevState.loaded, [id]: true },
          embeddables: {
            [id]: embeddable,
          },
        }));
      }
    }
  }
}
