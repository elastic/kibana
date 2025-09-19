/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldText, EuiFlexGroup, EuiImage, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { captureScreenshot, captureScreenshotFromUrl, saveScreenshot } from '..';
import type { SaveScreenshotOptions } from '../src/types';

export const CaptureScreenshotExample = ({
  fromUrl,
  options,
}: {
  fromUrl?: boolean;
  options?: SaveScreenshotOptions;
}) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
  const [url, setUrl] = useState<string>('');

  const onTakeScreenshot = async () => {
    setIsTakingScreenshot(true);
    setScreenshot(null);

    const captureResult = fromUrl ? await captureScreenshotFromUrl(url) : await captureScreenshot();

    if (captureResult) {
      if (options && options.save) {
        await saveScreenshot(url, captureResult.blob, { ...options });
      }
      setScreenshot(captureResult.image);
    }

    setIsTakingScreenshot(false);
  };

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="flexStart" gutterSize="s">
        <EuiFieldText
          data-test-subj="screenshottingCaptureScreenshotExampleFieldText"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: '400px', height: '35px' }}
        />
        <EuiButton
          data-test-subj="screenshottingCaptureScreenshotExampleTakeScreenshotButton"
          isLoading={isTakingScreenshot}
          onClick={onTakeScreenshot}
        >
          {i18n.translate(
            'app_not_found_in_i18nrc.captureScreenshotExample.takeScreenshotButtonLabel',
            { defaultMessage: 'Capture Screenshot' }
          )}
        </EuiButton>
        {screenshot && (
          <div style={{ width: 150, height: 150, overflow: 'clip' }}>
            <EuiImage src={screenshot} alt="screenshot" allowFullScreen />
          </div>
        )}
      </EuiFlexGroup>
    </>
  );
};
