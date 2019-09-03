/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../context';
import { CanvasRenderedElement } from '../types';
import { RenderedElement as RenderedElementComponent } from './rendered_element';

interface Props {
  element: CanvasRenderedElement;
  index: number;
}

export const RenderedElement = ({ index, element }: Props) => {
  const [{ renderers }] = useExternalEmbedState();

  const { expressionRenderable } = element;
  const { value } = expressionRenderable;
  const { as } = value;
  const fn = renderers[as];

  return <RenderedElementComponent {...{ element, fn, index }} />;
};
