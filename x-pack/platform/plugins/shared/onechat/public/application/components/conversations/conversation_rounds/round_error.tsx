/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface RoundErrorProps {
  error: unknown;
}

export const RoundError: React.FC<RoundErrorProps> = ({ error }) => {
  return (
    <EuiAccordion
      id="round-error"
      buttonContent={i18n.translate('xpack.onechat.roundError.title', {
        defaultMessage: 'The model had a brain freeze.',
      })}
      extraAction={
        <EuiButton size="s">
          {i18n.translate('xpack.onechat.roundError.tryAgain', { defaultMessage: 'Try again?' })}
        </EuiButton>
      }
    >
      {/* TODO: Add error details */}
    </EuiAccordion>
  );
};
