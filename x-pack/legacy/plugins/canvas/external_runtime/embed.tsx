/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StateContext } from './state';
import { Page } from './page';

export class Embed extends React.PureComponent {
  static contextType = StateContext;

  render() {
    const [{ workpad, height, width }] = this.context;
    const { height: workpadHeight, width: workpadWidth } = workpad;
    const transform = `scale3d(${width / workpadWidth}, ${height / workpadHeight}, 1)`;

    return (
      <div
        className="canvas canvasContainer"
        style={{ height, width, transform, transformOrigin: 'top left' }}
      >
        <Page />
      </div>
    );
  }
}
