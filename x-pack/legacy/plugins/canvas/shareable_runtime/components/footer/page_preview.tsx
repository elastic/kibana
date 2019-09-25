/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Page } from '../page';
import { CanvasRenderedPage } from '../../types';

import css from './page_preview.module.scss';

export type onClickProp = (index: number) => void;

export interface Props {
  /**
   * The height of the preview container.
   */
  height: number;

  /**
   * The index of the preview relative to other pages in the workpad.
   */
  index: number;

  /**
   * The handler to invoke if the preview is clicked.
   */
  onClick: onClickProp;

  /**
   * An object describing the page.
   */
  page: CanvasRenderedPage;

  /**
   * The height of the workpad.
   */
  workpadHeight: number;

  /**
   * The width of the workpad.
   */
  workpadWidth: number;
}

/**
 * The small preview of the page shown within the `Scrubber`.
 */
export const PagePreview = ({
  height,
  index,
  onClick,
  page,
  workpadHeight,
  workpadWidth,
}: Props) => {
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
      onClick={() => onClick(index)}
      onKeyPress={() => onClick(index)}
      style={style}
    >
      <div className={css.preview} style={transform}>
        <Page {...{ page }} height={workpadHeight} width={workpadWidth} />
      </div>
    </div>
  );
};
