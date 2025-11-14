/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';

export const RetryButton: React.FC<{}> = () => {
  const { retry } = useSendMessage();

  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.onechat.round.error.retryLabel', {
        defaultMessage: 'Retry',
      })}
      size="s"
      onClick={retry}
      data-test-subj="agentBuilderRoundErrorRetryButton"
    >
      <FormattedMessage id="xpack.onechat.round.error.tryAgain" defaultMessage="Try again?" />
    </EuiButtonEmpty>
  );
};
