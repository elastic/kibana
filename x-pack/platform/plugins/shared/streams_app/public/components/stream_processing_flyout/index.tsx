/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useCanvasEvents } from '../stream_management/data_management/stream_detail_canvas/state_management';
import { ProcessingErrorPrompt } from './error_prompt';

export function ProcessingFlyout({ edge }: { edge: string }) {
  const { closeRoutingFlyout } = useCanvasEvents();
  const headerId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      size="l"
      maxWidth={1600}
      aria-labelledby={headerId}
      onClose={closeRoutingFlyout}
      data-test-subj="streamsProcessingFlyout"
      paddingSize="none"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          css={css`
            padding: 12px 25px 0;
          `}
        >
          <EuiFlexItem>
            <EuiFlexGroup
              alignItems="center"
              css={css`
                min-height: 32px;
              `}
              gutterSize="s"
              wrap
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s" data-test-subj="streamsCanvasFlyoutTitle">
                  <h1 id={headerId}>
                    {i18n.translate('xpack.streams.processingFlyout.addRoutingLabel', {
                      defaultMessage: 'Add Processing',
                    })}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProcessingErrorPrompt edge={edge} onClose={closeRoutingFlyout} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
