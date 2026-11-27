/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { AutomationsLockedDescription } from './automations_locked_description';
import { AUTOMATIONS_HASH } from '../../paths';
import { AutomationsPanel } from './automations_panel';
import {
  AUTOMATIONS_HEADING_ID,
  AUTOMATIONS_PANEL_ID,
  goToAutomations,
} from './automations_panel_id';
import { LockedSectionPanel } from './locked_section_panel';

const automationsLockedAriaLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.lockedAriaLabel',
  {
    defaultMessage: 'Automations locked. Add a source in the Sources tab to unlock automations.',
  }
);

interface AutomationsSectionProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  aiIndexId: string;
  onSaved: () => void;
  isUnlocked: boolean;
  /** A section above is still loading, so the `#automations` scroll target can still move. */
  isContentAboveLoading?: boolean;
  headerAction?: ReactNode;
}

export const AutomationsSection = ({
  isLoading,
  aiIndex,
  aiIndexId,
  onSaved,
  isUnlocked,
  headerAction,
  isContentAboveLoading = false,
}: AutomationsSectionProps) => {
  const { hash, key: locationKey } = useLocation();
  const isAutomationsLinkTarget = hash === AUTOMATIONS_HASH;

  // Wait until the sections above have their height, or the scroll lands too high.
  const canScroll = !isLoading && !isContentAboveLoading;
  useEffect(() => {
    if (isAutomationsLinkTarget && canScroll) {
      goToAutomations();
    }
  }, [isAutomationsLinkTarget, canScroll, locationKey]);

  return isUnlocked ? (
    <AutomationsPanel
      isLoading={isLoading}
      aiIndex={aiIndex}
      onSaved={onSaved}
      isManaged={aiIndex?.managed === true}
      headerAction={headerAction}
    />
  ) : (
    <LockedSectionPanel
      id={AUTOMATIONS_PANEL_ID}
      headingId={AUTOMATIONS_HEADING_ID}
      data-test-subj="contextAutomationsLocked"
      ariaLabel={automationsLockedAriaLabel}
      title={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.automations.title"
          defaultMessage="Automations"
        />
      }
      description={<AutomationsLockedDescription aiIndexId={aiIndexId} />}
    />
  );
};
