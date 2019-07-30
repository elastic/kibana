/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StateContext } from './state';
import { ExternalEmbedElement } from './element';
import { CanvasElement } from './types';

export class Page extends React.PureComponent {
  static contextType = StateContext;

  render() {
    const [{ workpad, page }] = this.context;
    const { pages, height, width, id } = workpad;
    const { elements } = pages[page];

    const output = elements.map((element: CanvasElement) => (
      <ExternalEmbedElement key={element.id} element={element} />
    ));

    return (
      <div
        id={`page-${id}`}
        className="canvasPage canvasInteractivePage kbn-resetFocusState"
        style={{ height, width }}
      >
        {output}
      </div>
    );
  }
}
