/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EpisodeActionButton } from './episode_action_button';
import * as i18n from './translations';

export interface AlertEpisodeViewDetailsActionButtonProps {
  href: string;
  buttonsOutlined?: boolean;
}

export function AlertEpisodeViewDetailsActionButton({
  href,
  buttonsOutlined = true,
}: AlertEpisodeViewDetailsActionButtonProps) {
  return (
    <EpisodeActionButton
      outlined={buttonsOutlined}
      size="s"
      color="text"
      iconType="eye"
      href={href}
      data-test-subj="alertingEpisodeActionsViewDetailsButton"
      aria-label={i18n.ACTIONS_VIEW_DETAILS_LABEL}
      css={css`
        min-inline-size: unset;
      `}
    />
  );
}
