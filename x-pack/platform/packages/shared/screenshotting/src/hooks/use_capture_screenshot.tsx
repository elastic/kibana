/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { captureScreenshot, saveScreenshot } from '../..';
import type { SaveScreenshotOptions } from '../..';
import type { CaptureResult } from '../types';

export function useCaptureScreenshot(options?: SaveScreenshotOptions) {
  const [screenshot, setScreenshot] = useState<CaptureResult | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  const invokeCaptureScreenshot = useCallback(
    async (url: string = '') => {
      setIsCapturingScreenshot(true);
      setScreenshot(null);

      const captureResult = await captureScreenshot();

      if (captureResult) {
        if (options?.save) {
          await saveScreenshot(url, captureResult.blob, { ...options });
        }
        setScreenshot(captureResult);
      }

      setIsCapturingScreenshot(false);
    },
    [options]
  );

  return { screenshot, isCapturingScreenshot, invokeCaptureScreenshot };
}
