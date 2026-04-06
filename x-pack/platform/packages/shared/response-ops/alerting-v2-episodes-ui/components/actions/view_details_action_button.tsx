/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

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
  const buttonProps = {
    size: 's' as const,
    color: 'text' as const,
    iconType: 'eye',
    href,
    'data-test-subj': 'alertingEpisodeActionsViewDetailsButton',
    'aria-label': label,
    css: css`
      min-inline-size: unset;
    `,
  };

  return buttonsOutlined ? (
    <EuiButton {...buttonProps} fill={false} />
  ) : (
    <EuiButtonEmpty {...buttonProps} />
  );
}
