/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classnames from 'classnames';
import { PagePreview } from './page_preview.container';

import css from './scrubber.module.scss';
import { CanvasRenderedPage } from '../../types';

interface Props {
  isScrubberVisible: boolean;
  pages: CanvasRenderedPage[];
}

const THUMBNAIL_HEIGHT = 100;

/**
 * The panel of previews of the pages in the workpad, allowing one to select and
 * navigate to a specific page.
 */
export const Scrubber = ({ isScrubberVisible, pages }: Props) => {
  const className = isScrubberVisible ? classnames(css.root, css.visible) : css.root;

  const slides = pages.map((page, index) => (
    <PagePreview key={page.id} height={THUMBNAIL_HEIGHT} {...{ index }} />
  ));

  return (
    <div className={className}>
      <div className={css.slideContainer}>{slides}</div>
    </div>
  );
};
