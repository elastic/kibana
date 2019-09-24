/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classnames from 'classnames';
import { PagePreviewContainer } from './page_preview.container';

import css from './scrubber.module.scss';
import { CanvasRenderedPage } from '../../types';

interface Props {
  /**
   * True if the scrubber is currently visible, false otherwise.
   */
  isScrubberVisible: boolean;

  /**
   * A collection of objects describing the pages within the workpad to be
   * displayed in the Scrubber.
   */
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
    <PagePreviewContainer key={page.id} height={THUMBNAIL_HEIGHT} {...{ index }} />
  ));

  return (
    <div className={className}>
      <div className={css.slideContainer}>{slides}</div>
    </div>
  );
};
