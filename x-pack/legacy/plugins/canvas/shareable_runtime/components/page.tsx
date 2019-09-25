/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RenderedElementContainer } from './rendered_element.container';
import { CanvasRenderedPage, CanvasRenderedElement } from '../types';

import css from './page.module.scss';

interface Props {
  /**
   * The height of the page, in pixels.
   */
  height: number;
  /**
   * The width of the page, in pixels.
   */
  width: number;
  /**
   * An object describing the Page, taken from a Shareable Workpad.
   */
  page: CanvasRenderedPage;
}

/**
 * A Page in the Shareable Workpad is conceptually identical to a Page in a Workpad.
 */
export const Page = ({ page, height, width }: Props) => {
  const { elements, style, id } = page;

  const output = elements.map((element: CanvasRenderedElement, i) => (
    <RenderedElementContainer key={element.id} element={element} index={i + 1} />
  ));

  return (
    <div {...{ id }} className={css.root} style={{ height, width, ...style }}>
      {output}
    </div>
  );
};
