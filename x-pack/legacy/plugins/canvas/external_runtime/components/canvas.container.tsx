/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState, setPageAction, setScrubberVisibleAction } from '../context';
import { Canvas as CanvasComponent, onSetPageProp, onSetScrubberVisibleProp } from './canvas';

export const Canvas = () => {
  const [{ workpad, stage, settings, refs }, dispatch] = useExternalEmbedState();

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
    <CanvasComponent
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
