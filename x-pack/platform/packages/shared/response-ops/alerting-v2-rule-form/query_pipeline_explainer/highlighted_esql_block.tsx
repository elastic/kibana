/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCopy, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { splitQueryForHighlight } from './build_pipeline_steps';

const COPY_LABEL = i18n.translate('xpack.alertingV2.queryPipelineExplainer.copyQuery', {
  defaultMessage: 'Copy query',
});

/**
 * ES|QL display that mutes the unselected portion and emphasizes the step
 * segment. When no segment is provided (or it cannot be matched), the full
 * query is treated as the selected content.
 */
export const HighlightedEsqlBlock = ({
  query,
  highlightSegment,
  maxHeight = 320,
}: {
  query: string;
  highlightSegment?: string;
  maxHeight?: number;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { before, highlight, after } = useMemo(() => {
    if (highlightSegment?.trim()) {
      const split = splitQueryForHighlight(query, highlightSegment);
      if (split.highlight) {
        return split;
      }
    }
    return { before: '', highlight: query, after: '' };
  }, [query, highlightSegment]);

  return (
    <div
      data-test-subj="queryPipelineActiveQuery"
      css={css`
        position: relative;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.backgroundBasePlain};
        overflow: auto;
        max-block-size: ${maxHeight}px;
      `}
    >
      <div
        css={css`
          position: absolute;
          inset-block-start: ${euiTheme.size.s};
          inset-inline-end: ${euiTheme.size.s};
          z-index: 1;
        `}
      >
        <EuiCopy textToCopy={query}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copy"
              aria-label={COPY_LABEL}
              color="text"
              size="s"
              onClick={copy}
              data-test-subj="queryPipelineCopyQuery"
            />
          )}
        </EuiCopy>
      </div>
      <pre
        css={css`
          margin: 0;
          padding: ${euiTheme.size.m};
          padding-inline-end: ${euiTheme.size.xxl};
          font-family: ${euiTheme.font.familyCode};
          font-size: ${euiTheme.size.m};
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        `}
      >
        {before ? (
          <span
            data-test-subj="queryPipelineQueryMuted"
            css={css`
              color: ${euiTheme.colors.textSubdued};
              opacity: 0.55;
            `}
          >
            {before}
          </span>
        ) : null}
        <mark
          data-test-subj="queryPipelineQueryHighlight"
          css={css`
            color: ${euiTheme.colors.textPrimary};
            background: ${euiTheme.colors.backgroundBasePrimary};
            border-radius: ${euiTheme.border.radius.small};
            padding-block: 0;
            padding-inline: ${euiTheme.size.xxs};
            font-weight: ${euiTheme.font.weight.medium};
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
          `}
        >
          {highlight}
        </mark>
        {after ? <span>{after}</span> : null}
      </pre>
    </div>
  );
};
