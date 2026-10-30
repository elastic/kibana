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
import { KbnInfoCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useCanvasEvents } from '../stream_management/data_management/stream_detail_canvas/state_management';
import { RoutingErrorPrompt } from './error_prompt';

interface RoutingFlyoutProps {
  edge: string;
  /**
   * Testing aid: routes the line through a routing node with one placeholder
   * rule. Unset when the line cannot be routed.
   */
  onCreateTestRouting?: () => void;
}

export function RoutingFlyout({ edge, onCreateTestRouting }: RoutingFlyoutProps) {
  const { closeRoutingFlyout } = useCanvasEvents();
  const headerId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      size="l"
      maxWidth={1600}
      aria-labelledby={headerId}
      onClose={closeRoutingFlyout}
      data-test-subj="streamsRoutingFlyout"
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
                    {i18n.translate('xpack.streams.routingFlyout.addRoutingLabel', {
                      defaultMessage: 'Add Routing',
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
        <KbnInfoCallout
          size="s"
          title={i18n.translate('xpack.streams.routingFlyout.testRoutingTitle', {
            defaultMessage: 'Testing only',
          })}
          data-test-subj="streamsRoutingFlyoutTestRouting"
          actionProps={{
            primary: {
              onClick: onCreateTestRouting,
              isDisabled: !onCreateTestRouting,
              'data-test-subj': 'streamsRoutingFlyoutCreateTestRoutingButton',
              children: i18n.translate('xpack.streams.routingFlyout.createTestRoutingButtonLabel', {
                defaultMessage: 'Create test routing node',
              }),
            },
          }}
          text={
            <p>
              {i18n.translate('xpack.streams.routingFlyout.testRoutingDescription', {
                defaultMessage:
                  'Route this line through a routing node with a single placeholder rule that matches all data.',
              })}
            </p>
          }
        />
        <EuiSpacer size="m" />
        <RoutingErrorPrompt edge={edge} onClose={closeRoutingFlyout} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
