/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';
import { ShowDebugging } from './show_debugging';

export interface Props {
  payload: {
    error: Error;
  };
  onClose?: () => void;
}

const strings = {
  getDescription: () =>
    i18n.translate('xpack.canvas.errorComponent.description', {
      defaultMessage: 'Expression failed with the message:',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.errorComponent.title', {
      defaultMessage: 'Whoops! Expression failed',
    }),
};

export const Error: FC<Props> = ({ payload, onClose }) => {
  const message = payload.error?.message;

  return (
    <KbnDangerCallout
      css={{ maxWidth: 500 }}
      title={strings.getTitle()}
      text={message ? strings.getDescription() : ''}
      onDismiss={onClose}
      dismissButtonProps={{
        'aria-label': i18n.translate('xpack.canvas.errorComponent.dismissErrorAriaLabel', {
          defaultMessage: 'Dismiss error',
        }),
      }}
    >
      {message && (
        <p style={{ padding: '0 16px' }}>
          <Markdown readOnly>{message}</Markdown>
        </p>
      )}
      <ShowDebugging payload={payload} />
    </KbnDangerCallout>
  );
};
