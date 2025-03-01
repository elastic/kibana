/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBreadcrumb,
  EuiBreadcrumbs,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { WiredStreamGetResponse, getAncestorsAndSelf, isRoot } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export function CurrentStreamEntry({ definition }: { definition: WiredStreamGetResponse }) {
  const router = useStreamsAppRouter();
  const breadcrumbs: EuiBreadcrumb[] = getAncestorsAndSelf(definition.stream.name).map(
    (parentId) => {
      const isBreadcrumbsTail = parentId === definition.stream.name;

      return {
        text: parentId,
        href: isBreadcrumbsTail
          ? undefined
          : router.link('/{key}/{tab}/{subtab}', {
              path: {
                key: parentId,
                tab: 'management',
                subtab: 'route',
              },
            }),
      };
    }
  );

  const { euiTheme } = useEuiTheme();

  return (
    <>
      {!isRoot(definition.stream.name) && (
        <EuiBreadcrumbs
          max={2}
          breadcrumbs={breadcrumbs}
          truncate={false}
          css={css`
            padding-bottom: ${euiTheme.size.s};
          `}
        />
      )}
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          hasBorder
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.s};
          `}
        >
          <EuiText
            size="s"
            css={css`
              font-family: ${euiTheme.font.familyCode};
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            {definition.stream.name}
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.streamDetailRouting.currentStream', {
              defaultMessage: 'Current stream',
            })}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
}
