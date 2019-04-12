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
import { HelloWorldEmbeddable } from '../embeddables/hello_world_embeddable';

export class HelloWorldEmbeddableExample extends React.Component<{}> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private embeddable?: HelloWorldEmbeddable;

  public constructor() {
    super({});
    this.embeddableRoot = React.createRef();
  }

  public async componentDidMount() {
    if (this.embeddableRoot.current) {
      this.embeddable = new HelloWorldEmbeddable({ id: 'hello' });
      this.embeddable.renderInPanel(this.embeddableRoot.current);
    }
  }

  public componentWillUnmount() {
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
