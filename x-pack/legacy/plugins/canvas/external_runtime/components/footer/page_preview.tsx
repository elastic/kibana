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
  height: number;
  index: number;
  onClick: onClickProp;
  page: CanvasRenderedPage;
  workpadHeight: number;
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
