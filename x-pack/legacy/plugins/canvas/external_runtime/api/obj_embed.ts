/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'whatwg-fetch';
import { BaseEmbed, Options } from './base_embed';
import { CanvasWorkpad } from '../types';

export class Embed extends BaseEmbed {
  protected workpad: CanvasWorkpad;
  protected element: HTMLElement;
  protected options: Options = {};

  constructor(element: HTMLElement, workpad: CanvasWorkpad, options: Options = {}) {
    super();
    this.workpad = workpad;
    this.options = options;
    this.element = element;
    this._render();
  }

  async _getWorkpad() {
    return this.workpad;
  }
}
