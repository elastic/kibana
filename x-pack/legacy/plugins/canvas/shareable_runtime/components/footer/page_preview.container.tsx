/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../../context';
import { setPageAction } from '../../context/actions';
import { PagePreview, Props as PagePreviewProps } from './page_preview';

type Props = Pick<PagePreviewProps, 'index' | 'height'>;

/**
 * A store-connected container for the `PagePreview` component.
 */
export const PagePreviewContainer = ({ index, height }: Props) => {
  const [{ workpad }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const page = workpad.pages[index];
  const onClick = (pageIndex: number) => dispatch(setPageAction(pageIndex));
  const { height: workpadHeight, width: workpadWidth } = workpad;

  return <PagePreview {...{ onClick, height, workpadHeight, workpadWidth, page, index }} />;
};
