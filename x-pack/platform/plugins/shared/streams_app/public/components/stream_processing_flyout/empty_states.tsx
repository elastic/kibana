/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export function NoProcessorsPrompt({
  canAdd,
  onAddProcessor,
}: {
  canAdd: boolean;
  onAddProcessor: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="xl"
      aria-live="polite"
      css={css`
        padding: ${euiTheme.size.xl};
      `}
      data-test-subj="streamsProcessingFlyoutEmpty"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="m">
          <EuiFlexItem
            grow={false}
            css={css`
              padding: ${euiTheme.size.base};
              background: ${euiTheme.colors.backgroundBaseSubdued};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: ${euiTheme.border.radius.small};
            `}
          >
            <EuiIcon type="processor" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              max-width: calc(${euiTheme.size.xxxxl} * 6);
            `}
          >
            <EuiText size="s" textAlign="center">
              <h3
                css={css`
                  margin: 0;
                  font-size: inherit;
                  line-height: inherit;
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.translate('xpack.streams.processingFlyout.empty.title', {
                  defaultMessage: 'Structure your data',
                })}
              </h3>
              <p
                css={css`
                  margin-top: ${euiTheme.size.xs};
                `}
              >
                {i18n.translate('xpack.streams.processingFlyout.empty.body', {
                  defaultMessage:
                    'Add processors to parse and transform your data and extract fields you can use in Discover and dashboards.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          isDisabled={!canAdd}
          onClick={onAddProcessor}
          data-test-subj="streamsProcessingFlyoutEmptyAddProcessor"
        >
          {i18n.translate('xpack.streams.processingFlyout.empty.addProcessor', {
            defaultMessage: 'Add processor',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
