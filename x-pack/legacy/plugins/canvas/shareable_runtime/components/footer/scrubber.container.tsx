/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../../context';
import { Scrubber } from './scrubber';

/**
 * A store-connected container for the `Scrubber` component.
 */
export const ScrubberContainer = () => {
  const [{ workpad, footer }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { pages } = workpad;
  const { isScrubberVisible } = footer;

  return <Scrubber {...{ pages, isScrubberVisible }} />;
};
