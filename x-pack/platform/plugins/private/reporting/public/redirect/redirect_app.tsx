/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';

import { EuiCallOut, EuiCodeBlock, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { ScopedHistory } from '@kbn/core/public';
import {
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_REDIRECT_ALLOWED_LOCATOR_TYPES,
} from '@kbn/reporting-common';
import { LocatorParams } from '@kbn/reporting-common/types';
import { ReportingAPIClient } from '@kbn/reporting-public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';

import type { SharePluginSetup } from '../shared_imports';

interface Props {
  apiClient: ReportingAPIClient;
  history: ScopedHistory;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
}

const i18nTexts = {
  errorTitle: i18n.translate('xpack.reporting.redirectApp.errorTitle', {
    defaultMessage: 'Redirect error',
  }),
  consoleMessagePrefix: i18n.translate(
    'xpack.reporting.redirectApp.redirectConsoleErrorPrefixLabel',
    {
      defaultMessage: 'Redirect page error:',
    }
  ),
};

export const RedirectApp: FunctionComponent<Props> = ({ apiClient, screenshotMode, share }) => {
  const [error, setError] = useState<undefined | Error>();

  useEffect(() => {
    (async () => {
      try {
        let locatorParams: undefined | LocatorParams;

        const { jobId } = parse(window.location.search);

        if (jobId) {
          const result = await apiClient.getInfo(jobId as string);
          locatorParams = result?.locatorParams?.[0];
        } else {
          locatorParams = screenshotMode.getScreenshotContext<LocatorParams>(
            REPORTING_REDIRECT_LOCATOR_STORE_KEY
          );
        }

        if (!locatorParams) {
          throw new Error('Could not find locator params for report');
        }

        if (!REPORTING_REDIRECT_ALLOWED_LOCATOR_TYPES.includes(locatorParams.id)) {
          // eslint-disable-next-line no-console
          console.error(`Report job execution cannot redirect using ${locatorParams.id}`);
          throw new Error(
            'Report job execution can only redirect using a locator for an expected analytical app'
          );
        }

        share.navigate(locatorParams);
      } catch (e) {
        setError(e);
        // eslint-disable-next-line no-console
        console.error(i18nTexts.consoleMessagePrefix, e.message);
      }
    })();
  }, [apiClient, screenshotMode, share]);

  return (
    <div
      css={({ euiTheme }: UseEuiTheme) =>
        css({
          // Create some padding above and below the page so that the errors (if any) display nicely.
          margin: `${euiTheme.size.xxl} auto`,
        })
      }
    >
      {error ? (
        <EuiCallOut title={i18nTexts.errorTitle} color="danger">
          <p>{error.message}</p>
          {error.stack && <EuiCodeBlock>{error.stack}</EuiCodeBlock>}
        </EuiCallOut>
      ) : (
        // We don't show anything on this page, the share service will handle showing any issues with
        // using the locator
        <div />
      )}
    </div>
  );
};
