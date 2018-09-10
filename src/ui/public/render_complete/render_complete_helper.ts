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

const attributeName = 'data-render-complete';

export class RenderCompleteHelper {
  private title: string | null;

  constructor(private readonly element: HTMLElement) {
    this.setup();

    this.title = this.element.getAttribute('data-title');
  }

  public destroy = () => {
    console.error(`${this.title}: Render complete destroy`);
    this.element.removeEventListener('renderStart', this.start);
    this.element.removeEventListener('renderComplete', this.complete);
  };

  public setup = () => {
    console.error(`RenderCompleteHelper: ${this.title}: Render complete setup`);
    this.element.setAttribute(attributeName, 'false');
    this.element.addEventListener('renderStart', this.start);
    this.element.addEventListener('renderComplete', this.complete);
  };

  public disable = () => {
    this.element.setAttribute(attributeName, 'disabled');
    this.destroy();
  };

  private start = () => {
    if (this.title && this.title.indexOf('timelion') >= 0) {
      console.error(`RenderCompleteHelper: ${this.title}: data-render-complete: false`);
    }
    this.element.setAttribute(attributeName, 'false');
    return true;
  };

  private complete = () => {
    if (this.title && this.title.indexOf('timelion') >= 0) {
      console.error(`RenderCompleteHelper: ${this.title}: data-render-complete: true`);
    }
    this.element.setAttribute(attributeName, 'true');
    return true;
  };
}
