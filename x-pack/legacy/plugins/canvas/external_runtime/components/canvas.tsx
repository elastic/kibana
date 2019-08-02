/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useExternalEmbedState, setPage, setScrubberVisible } from '../context';
import { Page } from './page';
import { Footer, FOOTER_HEIGHT } from './footer';
import { getTimeInterval } from '../../public/lib/time_interval';

// @ts-ignore CSS Module
import css from './canvas.module';

let timeout: number = 0;

export const Canvas = () => {
  const [
    { workpad, height: containerHeight, width: containerWidth, page, settings },
    dispatch,
  ] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { toolbar, autoplay } = settings;
  const { height, width, pages } = workpad;
  const ratio = Math.max(width / containerWidth, height / containerHeight);
  const transform = `scale3d(${containerHeight / (containerHeight * ratio)}, ${containerWidth /
    (containerWidth * ratio)}, 1)`;

  const pageStyle = {
    height,
    transform,
    width,
  };

  if (autoplay.enabled && autoplay.interval) {
    clearTimeout(timeout);
    timeout = setTimeout(
      () => dispatch(setPage(page >= workpad.pages.length - 1 ? 0 : page + 1)),
      getTimeInterval(autoplay.interval)
    );
  }

  const [toolbarHidden, setToolbarHidden] = useState(toolbar.autohide);
  const rootHeight = containerHeight + (toolbar.autohide ? 0 : FOOTER_HEIGHT);

  const hideToolbar = (hidden: boolean) => {
    if (settings.toolbar.autohide) {
      if (hidden) {
        dispatch(setScrubberVisible(false));
      }
      setToolbarHidden(hidden);
    }
  };

  return (
    <div
      className={css.root}
      style={{ height: rootHeight, width: containerWidth }}
      onMouseEnter={() => hideToolbar(false)}
      onMouseLeave={() => hideToolbar(true)}
    >
      <div className={css.container} style={{ height: containerHeight, width: containerWidth }}>
        <div className={css.page} style={pageStyle}>
          <Page page={pages[page]} />
        </div>
      </div>
      <Footer hidden={toolbarHidden} />
    </div>
  );
};
