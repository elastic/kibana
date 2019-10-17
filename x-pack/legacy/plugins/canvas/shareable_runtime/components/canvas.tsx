/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useCanvasShareableState, setPageAction, setScrubberVisibleAction } from '../context';
import { Page } from './page';
import { Footer, FOOTER_HEIGHT } from './footer';
import { getTimeInterval } from '../../public/lib/time_interval';

import css from './canvas.module.scss';
import { CanvasRenderedWorkpad, Stage, Settings, Refs } from '../types';

let timeout: number = 0;

export type onSetPageFn = (page: number) => void;
export type onSetScrubberVisibleFn = (visible: boolean) => void;
type Workpad = Pick<CanvasRenderedWorkpad, 'height' | 'width' | 'pages'>;

interface Props {
  /**
   * The handler to invoke when a page is selected.
   */
  onSetPage: onSetPageFn;

  /**
   * The handler to invoke when the Scrubber is shown or hidden.
   */
  onSetScrubberVisible: onSetScrubberVisibleFn;

  /**
   * The `react` `ref` objects pertaining to the stage.
   */
  refs: Pick<Refs, 'stage'>;

  /**
   * An object describing the current settings of the Shareable.
   */
  settings: Settings;

  /**
   * An object describing the state of the workpad container.
   */
  stage: Stage;

  /**
   * The workpad being rendered within the Shareable area.
   */
  workpad: Workpad;
}

/**
 * The "canvas" for a workpad, which composes the toolbar and other components.
 */
export const CanvasComponent = ({
  onSetPage,
  onSetScrubberVisible,
  refs,
  settings,
  stage,
  workpad,
}: Props) => {
  const { toolbar, autoplay } = settings;
  const { height: stageHeight, width: stageWidth, page } = stage;
  const { height: workpadHeight, width: workpadWidth } = workpad;
  const ratio = Math.max(workpadWidth / stageWidth, workpadHeight / stageHeight);
  const transform = `scale3d(${stageHeight / (stageHeight * ratio)}, ${stageWidth /
    (stageWidth * ratio)}, 1)`;

  const pageStyle = {
    height: workpadHeight,
    transform,
    width: workpadWidth,
  };

  if (autoplay.isEnabled && autoplay.interval) {
    // We need to clear the timeout every time, even if it doesn't need to be or
    // it's null.  Since one could select a different page from the scrubber at
    // any point, or change the interval, we need to make sure the interval is
    // killed on React re-render-- otherwise the pages will start bouncing around
    // as timeouts are accumulated.
    clearTimeout(timeout);

    timeout = setTimeout(
      () => onSetPage(page >= workpad.pages.length - 1 ? 0 : page + 1),
      getTimeInterval(autoplay.interval)
    );
  }

  const [toolbarHidden, setToolbarHidden] = useState(toolbar.isAutohide);
  const rootHeight = stageHeight + (toolbar.isAutohide ? 0 : FOOTER_HEIGHT);

  const hideToolbar = (hidden: boolean) => {
    if (toolbar.isAutohide) {
      if (hidden) {
        // Hide the scrubber if we hide the toolbar.
        onSetScrubberVisible(false);
      }
      setToolbarHidden(hidden);
    }
  };

  return (
    <div
      className={css.root}
      style={{ height: rootHeight, width: stageWidth }}
      onMouseEnter={() => hideToolbar(false)}
      onMouseLeave={() => hideToolbar(true)}
      ref={refs.stage}
    >
      <div className={css.container} style={{ height: stageHeight, width: stageWidth }}>
        <div className={css.page} style={pageStyle}>
          <Page index={page} />
        </div>
      </div>
      <Footer isHidden={toolbarHidden} />
    </div>
  );
};

/**
 * A store-connected container for the `Canvas` component.
 */
export const Canvas = () => {
  const [{ workpad, stage, settings, refs }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const onSetPage: onSetPageFn = (page: number) => {
    dispatch(setPageAction(page));
  };

  const onSetScrubberVisible: onSetScrubberVisibleFn = (visible: boolean) => {
    dispatch(setScrubberVisibleAction(visible));
  };

  return (
    <CanvasComponent
      {...{
        onSetPage,
        onSetScrubberVisible,
        refs,
        settings,
        stage,
        workpad,
      }}
    />
  );
};
