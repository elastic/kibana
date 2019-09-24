/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState, setPageAction, setScrubberVisibleAction } from '../context';
import { Canvas, onSetPageProp, onSetScrubberVisibleProp } from './canvas';

/**
 * A store-connected container for the `Canvas` component.
 */
export const CanvasContainer = () => {
  const [{ workpad, stage, settings, refs }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const onSetPage: onSetPageProp = (page: number) => {
    dispatch(setPageAction(page));
  };

  const onSetScrubberVisible: onSetScrubberVisibleProp = (visible: boolean) => {
    dispatch(setScrubberVisibleAction(visible));
  };

  return (
    <Canvas
      {...{
        onSetPage,
        onSetScrubberVisible,
        refs,
        settings,
        stage,
        workpad,
      }}
    />
  );
};
