/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import type { ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import { useExpressionRenderer } from '@kbn/expressions-plugin/public';
import { SCREENSHOTTING_EXPRESSION, SCREENSHOTTING_EXPRESSION_INPUT } from '../../common';
import { ScreenshotModeContext } from './screenshot_mode_context';

export function App() {
  const elementRef = useRef(null);
  const screenshotMode = useContext(ScreenshotModeContext);
  const expression = useMemo(
    () =>
      screenshotMode?.getScreenshotContext<ExpressionRendererParams['expression']>(
        SCREENSHOTTING_EXPRESSION
      ) ?? '',
    [screenshotMode]
  );
  const context = useMemo(
    () => screenshotMode?.getScreenshotContext(SCREENSHOTTING_EXPRESSION_INPUT),
    [screenshotMode]
  );
  const { error, isEmpty } = useExpressionRenderer(elementRef, {
    expression,
    context,
  });

  // eslint-disable-next-line @elastic/eui/no-css-color
  const divCss = css`
    display: flex;
    width: 100%;
    height: 100%;
    width: 100vw;
    height: 100vh;
    background: white;

    .visualization {
      display: flex;
      flex: 1 1 100%;
      flex-direction: column;
      width: 100%;
      height: 100%;
      position: relative;
    }
  `;

  return (
    <div
      data-shared-item={!isEmpty || !error || null}
      data-render-error={!isEmpty && error ? error.message : null}
      ref={elementRef}
      className="scrExpression"
      css={divCss}
    />
  );
}
