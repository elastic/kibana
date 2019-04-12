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
import { EmbeddableFactoryRegistry } from 'plugins/embeddable_api/index';
import {
  DisabledLabEmbeddable,
  VISUALIZE_EMBEDDABLE_TYPE,
  VisualizeEmbeddable,
  VisualizeEmbeddableFactory,
  VisualizeInput,
} from 'plugins/kibana/visualize/embeddable';
import React from 'react';

export interface Props {
  embeddableFactories: EmbeddableFactoryRegistry;
}

export class VisualizeEmbeddableExample extends React.Component<Props, { viewMode: string }> {
  private mounted = false;
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private embeddable: VisualizeEmbeddable | DisabledLabEmbeddable | undefined;

  public constructor(props: Props) {
    super(props);
    this.state = {
      viewMode: 'view',
    };

    this.embeddableRoot = React.createRef();
  }

  public async componentDidMount() {
    this.mounted = true;
    const visualizeFactory = this.props.embeddableFactories.getFactoryByName(
      VISUALIZE_EMBEDDABLE_TYPE
    ) as VisualizeEmbeddableFactory;
    if (visualizeFactory) {
      const input: VisualizeInput = {
        customization: {},
      };
      this.embeddable = await visualizeFactory.create(
        {
          id: 'ed8436b0-b88b-11e8-a6d9-e546fe2bba5f',
        },
        input
      );
      if (this.mounted && this.embeddable && this.embeddableRoot.current) {
        this.embeddable.render(this.embeddableRoot.current);
      }
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  public render() {
    return (
      <div className="app-container dshAppContainer">
        <div style={{ height: '400px' }} ref={this.embeddableRoot} />
      </div>
    );
  }
}
