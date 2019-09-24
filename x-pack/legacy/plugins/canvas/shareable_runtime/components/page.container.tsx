/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../context';
import { Page } from './page';

interface Props {
  /**
   * The zero-based index of the page relative others within the workpad.
   */
  index: number;
}

/**
 * A store-connected container for the `Page` component.
 */
export const PageContainer = ({ index }: Props) => {
  const [{ workpad }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { height, width, pages } = workpad;
  const page = pages[index];

  return <Page {...{ page, height, width }} />;
};
