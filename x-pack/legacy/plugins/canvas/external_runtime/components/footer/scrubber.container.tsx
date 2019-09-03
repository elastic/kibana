/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../context';
import { Scrubber as ScrubberComponent } from './scrubber';

/**
 * The panel of previews of the pages in the workpad, allowing one to select and
 * navigate to a specific page.
 */
export const Scrubber = () => {
  const [{ workpad, footer }] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { pages } = workpad;
  const { isScrubberVisible } = footer;

  return <ScrubberComponent {...{ pages, isScrubberVisible }} />;
};
