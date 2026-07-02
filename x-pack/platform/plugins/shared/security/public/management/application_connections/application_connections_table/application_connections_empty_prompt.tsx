/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, EuiEmptyPrompt, EuiImage, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React from 'react';

import illustrationEmptyState from '../assets/illustration_empty_state.svg';
import { labels } from '../constants/i18n';

const emptyPromptStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-top: ${euiTheme.size.xl};
`;

export interface ApplicationConnectionsEmptyPromptProps {
  createClientUrl: string;
}

export const ApplicationConnectionsEmptyPrompt: FC<ApplicationConnectionsEmptyPromptProps> = ({
  createClientUrl,
}) => {
  return (
    <EuiEmptyPrompt
      data-test-subj="applicationConnectionsEmptyPrompt"
      css={emptyPromptStyles}
      icon={
        <EuiImage
          size={150}
          alt=""
          src={illustrationEmptyState}
          data-test-subj="applicationConnectionsEmptyPromptIllustration"
        />
      }
      title={<h2>{labels.emptyPrompt.title}</h2>}
      body={<p>{labels.emptyPrompt.message}</p>}
      actions={[
        <EuiButton
          fill
          data-test-subj="applicationConnectionsEmptyPromptAddButton"
          href={createClientUrl}
        >
          {labels.emptyPrompt.addButton}
        </EuiButton>,
        // TODO: Documentation link when available.
        <EuiLink
          external
          href="#"
          data-test-subj="applicationConnectionsEmptyPromptLearnMoreLink"
          target="_blank"
        >
          {labels.emptyPrompt.learnMoreLink}
        </EuiLink>,
      ]}
    />
  );
};
