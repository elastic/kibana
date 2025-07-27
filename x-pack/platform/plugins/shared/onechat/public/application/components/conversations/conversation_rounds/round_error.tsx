/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButton } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface RoundErrorProps {
  error: unknown;
}

export const RoundError: React.FC<RoundErrorProps> = ({ error }) => {
  return (
    <EuiAccordion
      id="round-error"
      buttonContent={
        <FormattedMessage
          id="xpack.onechat.round.error.title"
          defaultMessage="The model had a brain freeze."
        />
      }
      extraAction={
        <EuiButton size="s">
          <FormattedMessage id="xpack.onechat.round.error.tryAgain" defaultMessage="Try again?" />
        </EuiButton>
      }
    >
      {/* TODO: Add error details */}
    </EuiAccordion>
  );
};
