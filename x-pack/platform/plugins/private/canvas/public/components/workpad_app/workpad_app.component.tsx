/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, MouseEventHandler, useRef, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CANVAS } from '../../../i18n';
import { Sidebar } from '../sidebar';
import { Toolbar } from '../toolbar';
import { Workpad } from '../workpad';
import { WorkpadHeader } from '../workpad_header';
import { CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR } from '../../../common/lib/constants';
import { CanvasWorkpad, CommitFn } from '../../../types';
import { getUntitledWorkpadLabel } from '../../lib/doc_title';

export const WORKPAD_CONTAINER_ID = 'canvasWorkpadContainer';

export interface Props {
  deselectElement?: MouseEventHandler;
  isWriteable: boolean;
  workpad: CanvasWorkpad;
}

export const WorkpadApp: FC<Props> = ({ deselectElement, isWriteable, workpad }) => {
  const interactivePageLayout = useRef<CommitFn | null>(null); // future versions may enable editing on multiple pages => use array then
  const workpadTitle = useRef<HTMLHeadingElement>(null); // future versions may enable editing on multiple pages => use array then

  // TODO: Remove this focus when https://github.com/elastic/kibana/issues/38980 is addressed
  useEffect(() => {
    workpadTitle.current?.focus();
  }, [workpadTitle]);

  const registerLayout = useCallback((newLayout: CommitFn) => {
    if (interactivePageLayout.current !== newLayout) {
      interactivePageLayout.current = newLayout;
    }
  }, []);

  const unregisterLayout = useCallback((oldLayout: CommitFn) => {
    if (interactivePageLayout.current === oldLayout) {
      interactivePageLayout.current = null;
    }
  }, []);

  const commit = interactivePageLayout.current || (() => {});

  const untitledWorkpadLabel = useMemo(() => getUntitledWorkpadLabel(), []);

  return (
    <div className="canvasLayout">
      <div className="canvasLayout__rows">
        <div className="canvasLayout__cols">
          <div className="canvasLayout__stage">
            <div className="canvasLayout__stageHeader">
              <h1
                id="canvasWorkpadTitle"
                className="euiScreenReaderOnly"
                ref={workpadTitle}
                tabIndex={-1}
              >{`${CANVAS} - ${workpad.name || untitledWorkpadLabel}`}</h1>
              <WorkpadHeader commit={commit} />
            </div>

            <div
              id={CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR}
              className={CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR}
            >
              {/* NOTE: canvasWorkpadContainer is used for exporting */}
              <div
                id={WORKPAD_CONTAINER_ID}
                className="canvasWorkpadContainer canvasLayout__stageContentOverflow"
              >
                <Workpad registerLayout={registerLayout} unregisterLayout={unregisterLayout} />
              </div>
            </div>
          </div>

          {isWriteable && (
            <div className="canvasLayout__sidebar hide-for-sharing">
              <Sidebar commit={commit} />
            </div>
          )}
        </div>

        <div className="canvasLayout__footer hide-for-sharing">
          <Toolbar />
        </div>
      </div>
    </div>
  );
};

WorkpadApp.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  deselectElement: PropTypes.func,
};
