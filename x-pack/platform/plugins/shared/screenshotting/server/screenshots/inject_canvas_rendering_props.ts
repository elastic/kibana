/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import { CONTEXT_INJECTCANVASRENDERINGPROPS } from './constants';
import type { EventLogger } from './event_logger';
import { Actions } from './event_logger';

export const injectCanvasRenderingProps = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
): Promise<void> => {
  if (layout.id !== 'preserve_layout') {
    return;
  }

  const { kbnLogger } = eventLogger;

  const spanEnd = eventLogger.logScreenshottingEvent(
    'inject Canvas rendering properties',
    Actions.INJECT_CANVAS_RENDERING_PROPS,
    'correction'
  );

  try {
    await browser.evaluate(
      {
        fn: () => {
          const originalGetContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (contextType: any, options?: any): any {
            const context = originalGetContext.call(this, contextType, options);

            if (contextType === '2d' && context) {
              const ctx2d = context as CanvasRenderingContext2D;
              ctx2d.textRendering = 'geometricPrecision';
            }
            return context;
          };

          // fillText override to reassert textRendering - fix for lens reports
          const originalFillText = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function (
            text: string,
            x: number,
            y: number,
            maxWidth?: number
          ) {
            this.textRendering = 'geometricPrecision';
            return originalFillText.call(this, text, x, y, maxWidth);
          };
        },
        args: [],
      },
      { context: CONTEXT_INJECTCANVASRENDERINGPROPS },
      kbnLogger
    );
  } catch (err) {
    kbnLogger.error(err);
    eventLogger.error(err, Actions.INJECT_CANVAS_RENDERING_PROPS);
    throw new Error(
      `An error occurred when trying to inject Canvas rendering properties. ${err.message}`
    );
  }

  spanEnd();
};
