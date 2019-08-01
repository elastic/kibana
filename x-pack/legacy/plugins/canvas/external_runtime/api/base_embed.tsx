/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from '../components/app';
import { CanvasWorkpad } from '../types';

export interface Options {
  height?: number;
  width?: number;
  page?: number;
}

export abstract class BaseEmbed {
  protected abstract element: HTMLElement;
  protected abstract options: Options = {};
  protected abstract _getWorkpad(): Promise<CanvasWorkpad | undefined | null>;

  async _render() {
    try {
      const workpad = await this._getWorkpad();

      if (workpad) {
        const { page } = this.options;
        let { height, width } = this.options;

        if (height && !width) {
          width = workpad.width * (height / workpad.height);
        } else if (width && !height) {
          height = workpad.height * (width / workpad.width);
        }

        const options = {
          height: height || workpad.height,
          width: width || workpad.width,
          page: page !== undefined ? page : workpad.page,
        };

        render(<App workpad={workpad} {...options} />, this.element);
        return;
      }
    } catch {
      render(<p>Error</p>, this.element);
    }
  }
}
