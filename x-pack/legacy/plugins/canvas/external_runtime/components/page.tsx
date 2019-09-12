/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RenderedElement } from './rendered_element.container';
import { CanvasRenderedPage, CanvasRenderedElement } from '../types';

import css from './page.module.scss';

interface Props {
  height: number;
  width: number;
  page: CanvasRenderedPage;
}

export const Page = ({ page, height, width }: Props) => {
  const { elements, style, id } = page;

  const output = elements.map((element: CanvasRenderedElement, i) => (
    <RenderedElement key={element.id} element={element} index={i + 1} />
  ));

  return (
    <div id={`page-${id}`} className={css.root} style={{ height, width, ...style }}>
      {output}
    </div>
  );
};
