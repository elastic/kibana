/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiMarkdownFormat, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

/** Height at which the preview is cut off and faded. Roughly six lines of compressed text. */
export const RUNBOOK_PREVIEW_MAX_HEIGHT = 120;

export interface AlertEpisodeRunbookProps {
  content: string | undefined;
  /**
   * Renders the markdown one text size down so its headings sit below the panel's own
   * heading rather than competing with it. `EuiMarkdownFormat` scales its whole type
   * scale from this, so headings, body and code shrink together.
   */
  compressed?: boolean;
  /** Clamps the content to a short, bottom-faded preview. */
  preview?: boolean;
}

export const AlertEpisodeRunbook = ({ content, compressed, preview }: AlertEpisodeRunbookProps) => {
  if (!content || content.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeDetailsRunbookEmpty">
        {i18n.RUNBOOK_EMPTY}
      </EuiText>
    );
  }

  const markdown = (
    <EuiMarkdownFormat
      textSize={compressed ? 'xs' : 's'}
      css={css`
        word-wrap: break-word;
      `}
      data-test-subj="alertingV2EpisodeDetailsRunbookContent"
    >
      {content}
    </EuiMarkdownFormat>
  );

  if (!preview) {
    return markdown;
  }

  return (
    <div
      // A mask fades the cut-off edge instead of a gradient overlay, so it works on any
      // panel background without having to know the colour.
      css={css`
        max-block-size: ${RUNBOOK_PREVIEW_MAX_HEIGHT}px;
        overflow: hidden;
        mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
      `}
      data-test-subj="alertingV2EpisodeDetailsRunbookPreview"
    >
      {markdown}
    </div>
  );
};
