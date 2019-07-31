/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ExternalEmbedElement } from './element';
import { useAppStateValue } from '../context';
import { CanvasPage, CanvasElement } from '../types';

interface Props {
  page: CanvasPage;
}

export const Page = (props: Props) => {
  const [{ workpad }] = useAppStateValue();
  if (!workpad) {
    return null;
  }

  const { height, width, id } = workpad;
  const { elements, style } = props.page;

  const output = elements.map((element: CanvasElement) => (
    <ExternalEmbedElement key={element.id} element={element} />
  ));

  return (
    <div
      id={`page-${id}`}
      className="canvasPage canvasInteractivePage kbn-resetFocusState"
      style={{ height, width, overflow: 'hidden', ...style }}
    >
      {output}
    </div>
  );
};
