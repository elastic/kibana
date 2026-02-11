/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiText,
  EuiIcon,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { getAncestorsAndSelf } from '@kbn/streams-schema';
import React from 'react';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export function CurrentStreamEntry({
  definition,
}: {
  definition: Streams.WiredStream.GetResponse;
}) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();

  const ancestors = getAncestorsAndSelf(definition.stream.name);

  return (
    <EuiFlexItem grow={false}>
      <EuiPanel
        color="subdued"
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        className={css`
          overflow: hidden;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" wrap={true}>
          {ancestors.map((streamName, index) => {
            const isLast = index === ancestors.length - 1;

            return (
              <React.Fragment key={streamName}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={isLast ? 'folderOpen' : 'folderClosed'}
                        size="m"
                        color="subdued"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {isLast ? (
                        <EuiText size="xs" color="subdued">
                          {streamName}
                        </EuiText>
                      ) : (
                        <EuiLink
                          href={router.link('/{key}/management/{tab}', {
                            path: {
                              key: streamName,
                              tab: 'partitioning',
                            },
                          })}
                        >
                          <EuiText
                            size="xs"
                            css={css`
                              font-weight: ${euiTheme.font.weight.bold};
                            `}
                          >
                            {streamName}
                          </EuiText>
                        </EuiLink>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                {!isLast && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type="arrowRight"
                      size="s"
                      color="subdued"
                      css={css`
                        margin: 0 ${euiTheme.size.xs};
                      `}
                    />
                  </EuiFlexItem>
                )}
              </React.Fragment>
            );
          })}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
