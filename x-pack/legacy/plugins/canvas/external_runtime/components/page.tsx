/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RenderedElement } from './rendered_element';
import { useExternalEmbedState } from '../context';
import { CanvasRenderedPage, CanvasRenderedElement } from '../types';

// @ts-ignore CSS Module
import css from './page.module';

interface Props {
  page: CanvasRenderedPage;
}

export const Page = (props: Props) => {
  const [{ workpad }] = useExternalEmbedState();
  if (!workpad) {
    return null;
  }

  const { height, width, id } = workpad;
  const { elements, style } = props.page;

  const output = elements.map((element: CanvasRenderedElement, index) => (
    <RenderedElement key={element.id} element={element} number={index + 1} />
  ));

  return (
    <div id={`page-${id}`} className={css.root} style={{ height, width, ...style }}>
      {output}
    </div>
  );
};
