/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoundTraceFlyout } from '../conversation_rounds/round_response/round_trace_flyout';

const labels = {
  loadTrace: i18n.translate('xpack.agentBuilder.conversationLoadTraceButton.label', {
    defaultMessage: 'Load trace from file',
  }),
};

export const ConversationLoadTraceButton = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const handleOpen = useCallback(() => setIsFlyoutOpen(true), []);
  const handleClose = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <EuiToolTip content={labels.loadTrace} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="upload"
          color="text"
          aria-label={labels.loadTrace}
          onClick={handleOpen}
          data-test-subj="conversationLoadTraceButton"
        />
      </EuiToolTip>
      {isFlyoutOpen && <RoundTraceFlyout onClose={handleClose} />}
    </>
  );
};
