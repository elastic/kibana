/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from '../components/app';
import { CanvasRenderedWorkpad } from '../types';

export interface Options {
  /** The preferred height to scale the embedded workpad.  If only `height` is
   * specified, `width` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size. */
  height?: number;
  /** The preferred width to scale the embedded workpad.  If only `width` is
   * specified, `height` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size. */
  width?: number;
  /** The initial page to display. */
  page?: number;
}

/**
 * This is an abstract embedding component.  It provides all of the scaling and
 * other option handling for embedding strategies.
 */
export abstract class BaseEmbed {
  protected abstract element: HTMLElement;
  protected abstract options: Options = {};
  protected abstract _getWorkpad(): Promise<CanvasRenderedWorkpad | undefined | null>;

  async _render() {
    try {
      const workpad = await this._getWorkpad();

      if (workpad) {
        const { page } = this.options;
        let { height, width } = this.options;

        if (height && !width) {
          // If we have a height but no width, the width should honor the workpad ratio.
          width = workpad.width * (height / workpad.height);
        } else if (width && !height) {
          // If we have a width but no height, the height should honor the workpad ratio.
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
      // TODO: make this sexier
      render(<p>Error</p>, this.element);
    }
  }
}
