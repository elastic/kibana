/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../context';
import { setPageAction } from '../../context/actions';
import { PagePreview as PagePreviewComponent } from './page_preview';

interface Props {
  index: number;
  height: number;
}

/**
 * The small preview of the page shown within the `Scrubber`.
 */
export const PagePreview = ({ index, height }: Props) => {
  const [{ workpad }, dispatch] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const page = workpad.pages[index];
  const onClick = (pageIndex: number) => dispatch(setPageAction(pageIndex));
  const { height: workpadHeight, width: workpadWidth } = workpad;

  return (
    <PagePreviewComponent {...{ onClick, height, workpadHeight, workpadWidth, page, index }} />
  );
};
