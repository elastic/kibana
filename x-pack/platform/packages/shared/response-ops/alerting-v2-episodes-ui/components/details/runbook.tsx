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

export interface AlertEpisodeRunbookProps {
  content: string | undefined;
}

export const AlertEpisodeRunbook = ({ content }: AlertEpisodeRunbookProps) =>
  content && content.length > 0 ? (
    <EuiMarkdownFormat
      textSize="s"
      css={css`
        word-wrap: break-word;
      `}
      data-test-subj="alertingV2EpisodeDetailsRunbookContent"
    >
      {content}
    </EuiMarkdownFormat>
  ) : (
    <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeDetailsRunbookEmpty">
      {i18n.RUNBOOK_EMPTY}
    </EuiText>
  );
