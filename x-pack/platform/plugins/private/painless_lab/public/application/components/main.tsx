/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { kibanaFullBodyHeightCss } from '@kbn/core/public';
import { formatRequestPayload, formatJson } from '../lib/format';
import { exampleScript } from '../constants';
import { PayloadFormat } from '../types';
import { useSubmitCode } from '../hooks';
import { useAppContext } from '../context';
import { OutputPane } from './output_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';

export const Main: React.FunctionComponent = () => {
  const {
    store: { payload, validation },
    updatePayload,
    services: { http },
    links,
  } = useAppContext();

  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
  const { inProgress, response, submit } = useSubmitCode(http);

  // Live-update the output and persist payload state as the user changes it.
  useEffect(() => {
    if (validation.isValid) {
      submit(payload);
    }
  }, [payload, submit, validation.isValid]);

  const toggleRequestFlyout = () => {
    setRequestFlyoutOpen(!isRequestFlyoutOpen);
  };

  const { euiTheme } = useEuiTheme();

  /**
   * This is a very brittle way of preventing the editor and other content from disappearing
   * behind the bottom bar.
   * The size comes in `px` and is set in the theme, so we need to parse it to get the number.
   */
  const bottomBarHeight = parseInt(euiTheme.size.base, 10) * 3;
  // adding dev tool top bar + bottom bar height to the body offset
  // (they're both the same height, hence the x2)
  const bodyOffset = bottomBarHeight * 2;

  return (
    <div
      css={css`
        ${kibanaFullBodyHeightCss(bodyOffset)}
      `}
    >
      <EuiFlexGroup
        responsive={false}
        gutterSize="none"
        css={css`
          // The panels container should adopt the height of the main container
          height: 100%;
        `}
      >
        <EuiFlexItem
          css={css`
            padding-top: ${euiTheme.size.m};
            background-color: ${euiTheme.colors.emptyShade};
          `}
        >
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painlessLab.title', {
                defaultMessage: 'Painless Lab',
              })}
            </h1>
          </EuiTitle>

          <Editor
            context={payload.context}
            code={payload.code}
            onChange={(nextCode) => updatePayload({ code: nextCode })}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <OutputPane isLoading={inProgress} response={response} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        links={links}
        isLoading={inProgress}
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => updatePayload({ code: exampleScript })}
      />

      {isRequestFlyoutOpen && (
        <RequestFlyout
          links={links}
          onClose={() => setRequestFlyoutOpen(false)}
          requestBody={formatRequestPayload(payload, PayloadFormat.PRETTY)}
          response={response ? formatJson(response.result || response.error) : ''}
        />
      )}
    </div>
  );
};
