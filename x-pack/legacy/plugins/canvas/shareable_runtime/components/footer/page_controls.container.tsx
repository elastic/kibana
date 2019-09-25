/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  useCanvasShareableState,
  setScrubberVisibleAction,
  setPageAction,
  setAutoplayAction,
} from '../../context';
import { PageControls } from './page_controls';

/**
 * A store-connected container for the `PageControls` component.
 */
export const PageControlsContainer = () => {
  const [{ workpad, footer, stage }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { isScrubberVisible } = footer;
  const { page } = stage;
  const totalPages = workpad.pages.length;

  const onToggleScrubber = () => {
    dispatch(setAutoplayAction(false));
    dispatch(setScrubberVisibleAction(!isScrubberVisible));
  };
  const onSetPageNumber = (number: number) => dispatch(setPageAction(number));

  return <PageControls {...{ onToggleScrubber, onSetPageNumber, page, totalPages }} />;
};
