/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getSelectedPage, getPageById, getSelectedElementId } from '../../state/selectors/workpad';
import { ElementContent as Component, Props as ComponentProps } from './element_content';
import { State } from '../../../types';
import { getCanvasExpressionService } from '../../services/canvas_expressions_service';

export type Props = Omit<ComponentProps, 'renderFunction' | 'backgroundColor'>;

export const ElementContent = (props: Props) => {
  const selectedPageId = useSelector(getSelectedPage);
  const selectedElementId = useSelector(getSelectedElementId);
  const backgroundColor =
    useSelector((state: State) => getPageById(state, selectedPageId)?.style.background) || '';
  const { renderable } = props;

  const renderFunction = useMemo(() => {
    return renderable ? getCanvasExpressionService().getRenderer(renderable.as) : null;
  }, [renderable]);

  return <Component {...{ ...props, renderFunction, backgroundColor, selectedElementId }} />;
};
