/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EpisodeActionButton } from './episode_action_button';

const label = i18n.translate('xpack.alertingV2.episodesUi.actions.viewDetailsLabel', {
  defaultMessage: 'View details',
});

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
      aria-label={label}
      css={css`
        min-inline-size: unset;
      `}
    />
  );
}
