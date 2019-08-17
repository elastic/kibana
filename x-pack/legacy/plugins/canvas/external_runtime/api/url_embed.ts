/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'whatwg-fetch';
import { BaseEmbed, Options } from './base_embed';

/**
 * Embed a Canvas Workpad from a URL.
 *
 * NOTE: this is *not* the source workpad one might export from Canvas.  The
 * workpad loaded from the URL needs to be the transient workpad, where data-
 * driven expressions have already been evaluated.
 */
export class EmbedFromURL extends BaseEmbed {
  protected workpadURL: string;
  protected element: HTMLElement;
  protected options: Options = {};

  constructor(element: HTMLElement, workpadURL: string, options: Options = {}) {
    super();
    this.workpadURL = workpadURL;
    this.options = options;
    this.element = element;
    this._render();
  }

  async _getWorkpad() {
    const workpadResponse = await fetch(this.workpadURL);
    if (workpadResponse.ok) {
      return await workpadResponse.json();
    }
    return null;
  }
}
