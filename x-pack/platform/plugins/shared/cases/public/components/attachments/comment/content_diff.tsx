/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { diffWordsWithSpace } from 'diff';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface ContentDiffProps {
  previous: string;
  current: string;
}

/** Word-level diff of the raw comment text: additions in green, removals struck through in red. */
export const ContentDiff: React.FC<ContentDiffProps> = ({ previous, current }) => {
  const { euiTheme } = useEuiTheme();
  const changes = useMemo(() => diffWordsWithSpace(previous, current), [previous, current]);

  const styles = useMemo(
    () => ({
      container: css`
        white-space: pre-wrap;
        word-break: break-word;
      `,
      added: css`
        background-color: ${euiTheme.colors.backgroundLightSuccess};
        color: ${euiTheme.colors.textSuccess};
      `,
      removed: css`
        background-color: ${euiTheme.colors.backgroundLightDanger};
        color: ${euiTheme.colors.textDanger};
        text-decoration: line-through;
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiText size="xs" css={styles.container} data-test-subj="comment-content-diff">
      {changes.map((change, index) => {
        if (change.added) {
          return (
            <ins key={index} css={styles.added} data-test-subj="comment-content-diff-added">
              {change.value}
            </ins>
          );
        }

        if (change.removed) {
          return (
            <del key={index} css={styles.removed} data-test-subj="comment-content-diff-removed">
              {change.value}
            </del>
          );
        }

        return <span key={index}>{change.value}</span>;
      })}
    </EuiText>
  );
};

ContentDiff.displayName = 'ContentDiff';
