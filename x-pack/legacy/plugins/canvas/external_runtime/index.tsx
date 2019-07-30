/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from './app';
import 'whatwg-fetch';
import 'babel-polyfill';

export interface Options {
  height?: number;
  width?: number;
  page?: number;
}

export class Runtime {
  private workpadURL: string;
  private element: HTMLElement;
  private options: Options = {};

  constructor(element: HTMLElement, workpadURL: string, options: Options = {}) {
    this.workpadURL = workpadURL;
    this.options = options;
    this.element = element;
    this._render();
  }

  async _render() {
    try {
      if (this.element && this.workpadURL) {
        const workpadResponse = await fetch(this.workpadURL);
        if (workpadResponse) {
          const workpad = await workpadResponse.json();
          if (workpad) {
            const { height, width, page } = this.options;
            const options = {
              height: height || workpad.height,
              width: width || workpad.width,
              page: page !== undefined ? page : workpad.page,
            };

            render(<App workpad={workpad} {...options} />, this.element);
            return;
          }
        }
      }
    } catch {
      render(<p>Error</p>, this.element);
    }
  }
}
