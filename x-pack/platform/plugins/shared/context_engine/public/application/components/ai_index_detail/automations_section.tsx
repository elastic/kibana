/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { ReactNode } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { AutomationsLockedDescription } from './automations_locked_description';
import { AutomationsPanel } from './automations_panel';
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
  /** Replaces the "Add automation" menu in the panel header (see `AutomationsPanel`). */
  headerAction?: ReactNode;
}

export const AutomationsSection = ({
  isLoading,
  aiIndex,
  aiIndexId,
  onSaved,
  isUnlocked,
  headerAction,
}: AutomationsSectionProps) =>
  isUnlocked ? (
    <AutomationsPanel
      isLoading={isLoading}
      aiIndex={aiIndex}
      onSaved={onSaved}
      isManaged={aiIndex?.managed === true}
      headerAction={headerAction}
    />
  ) : (
    <LockedSectionPanel
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
