/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoundTraceFlyout } from './round_trace_flyout';

const ariaLabel = i18n.translate('xpack.agentBuilder.round.traceButton.ariaLabel', {
  defaultMessage: 'View Trace',
});

interface RoundTraceButtonProps {
  traceId: string;
}

/**
 * Icon button that opens `RoundTraceFlyout` for the given `traceId`.
 */
export const RoundTraceButton: React.FC<RoundTraceButtonProps> = ({ traceId }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <EuiButtonIcon
        iconType="apmTrace"
        color="text"
        aria-label={ariaLabel}
        onClick={openFlyout}
        data-test-subj="roundTraceButton"
      />
      {isFlyoutOpen && <RoundTraceFlyout traceId={traceId} onClose={closeFlyout} />}
    </>
  );
};
