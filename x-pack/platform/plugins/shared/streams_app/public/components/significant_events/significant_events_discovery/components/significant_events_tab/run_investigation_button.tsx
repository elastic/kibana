/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/streams-schema';
import { useTriggerInvestigation } from '../../../../../hooks/significant_events/use_trigger_investigation';

const RUN_LABEL = i18n.translate('xpack.streams.sigEventsTab.runInvestigationButton.label', {
  defaultMessage: 'Run investigation',
});

const RUN_ARIA_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.runInvestigationButton.ariaLabel',
  {
    defaultMessage: 'Run investigation for this event',
  }
);

interface RunInvestigationButtonProps {
  event: SignificantEvent;
  /** Renders as an icon-only button (for use in table rows). */
  iconOnly?: boolean;
  /** Called when the trigger request succeeds (before the workflow's async steps run). */
  onTriggerSuccess?: () => void;
}

export const RunInvestigationButton = ({
  event,
  iconOnly = false,
  onTriggerSuccess,
}: RunInvestigationButtonProps) => {
  const { triggerInvestigation, isTriggering } = useTriggerInvestigation({ onTriggerSuccess });

  const handleClick = (e: React.MouseEvent) => {
    if (iconOnly) {
      // Prevent the row-click handler from opening the flyout simultaneously.
      e.stopPropagation();
    }
    if (!isTriggering) {
      triggerInvestigation(event.event_id);
    }
  };

  if (iconOnly) {
    return (
      <EuiButtonIcon
        iconType="inspect"
        aria-label={RUN_ARIA_LABEL}
        onClick={handleClick}
        isDisabled={isTriggering}
        isLoading={isTriggering}
        size="s"
        color="primary"
        data-test-subj="sigEventRunInvestigationIconButton"
      />
    );
  }

  return (
    <EuiButton
      iconType="inspect"
      onClick={handleClick}
      isDisabled={isTriggering}
      isLoading={isTriggering}
      fill
      size="s"
      data-test-subj="sigEventRunInvestigationButton"
    >
      {RUN_LABEL}
    </EuiButton>
  );
};
