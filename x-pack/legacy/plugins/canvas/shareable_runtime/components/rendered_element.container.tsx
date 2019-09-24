/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../context';
import { RenderedElement, Props as RenderedElementProps } from './rendered_element';

type Props = Pick<RenderedElementProps, 'element' | 'index'>;

/**
 * A store-connected container for the `RenderedElement` component.
 */
export const RenderedElementContainer = ({ index, element }: Props) => {
  const [{ renderers }] = useCanvasShareableState();

  const { expressionRenderable } = element;
  const { value } = expressionRenderable;
  const { as } = value;
  const fn = renderers[as];

  return <RenderedElement {...{ element, fn, index }} />;
};
