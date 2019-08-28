/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../context';
import { Page } from '../page';
import { setPage } from '../../context/actions';
import { CanvasRenderedPage } from '../../types';

// @ts-ignore CSS Module
import css from './page_preview.module';

interface Props {
  number: number;
  height: number;
  page: CanvasRenderedPage;
}

/**
 * The small preview of the page shown within the `Scrubber`.
 */
export const PagePreview = ({ number, page, height }: Props) => {
  const [{ workpad }, dispatch] = useExternalEmbedState();
  if (!workpad) {
    return null;
  }

  const onClick = (index: number) => dispatch(setPage(index));
  const { height: workpadHeight, width: workpadWidth } = workpad;
  const scale = height / workpadHeight;
  const style = {
    height: workpadHeight * scale,
    width: workpadWidth * scale,
  };
  const transform = {
    ...style,
    transform: `scale3d(${scale}, ${scale}, 1)`,
  };

  return (
    <div
      className={css.root}
      onClick={() => onClick(number)}
      onKeyPress={() => onClick(number)}
      style={style}
    >
      <div className={css.preview} style={transform}>
        <Page page={page} />
      </div>
    </div>
  );
};
