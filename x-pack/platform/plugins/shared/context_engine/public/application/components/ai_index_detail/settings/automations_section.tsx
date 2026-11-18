/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { AutomationsPanel } from '../automations_panel';
import { LockedSectionPanel } from '../locked_section_panel';

interface AutomationsSectionProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isUnlocked: boolean;
}

export const AutomationsSection = ({
  isLoading,
  aiIndex,
  onSaved,
  isUnlocked,
}: AutomationsSectionProps) =>
  isUnlocked ? (
    <AutomationsPanel
      isLoading={isLoading}
      aiIndex={aiIndex}
      onSaved={onSaved}
      isManaged={aiIndex?.managed === true}
    />
  ) : (
    <LockedSectionPanel
      data-test-subj="contextAiIndexSettingsAutomationsLocked"
      ariaLabel={i18n.translate(
        'xpack.contextEngine.aiIndexDetail.settings.automations.lockedAriaLabel',
        {
          defaultMessage:
            'Automations locked. Add a source in the Sources tab to unlock automations.',
        }
      )}
      title={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.settings.automations.title"
          defaultMessage="Automations"
        />
      }
      description={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.settings.automations.lockedBody"
          defaultMessage="Add a source in the Sources tab to unlock automations."
        />
      }
    />
  );
