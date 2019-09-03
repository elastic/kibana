/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  useExternalEmbedState,
  setScrubberVisibleAction,
  setPageAction,
  setAutoplayAction,
} from '../../context';
import { PageControls as PageControlsComponent } from './page_controls';

/**
 * The page count and paging controls within the footer of the Embedded Workpad.
 */
export const PageControls = () => {
  const [{ workpad, footer, stage }, dispatch] = useExternalEmbedState();

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

  return <PageControlsComponent {...{ onToggleScrubber, onSetPageNumber, page, totalPages }} />;
};
