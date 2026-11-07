/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCallOut,
  EuiCode,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CASES_OUTCOMES_AI_INDEX_ID } from '../../../common/constants';

export const KNOWLEDGE_TITLE = i18n.translate('xpack.cases.settings.knowledge.title', {
  defaultMessage: 'Knowledge',
});
export const KNOWLEDGE_DESCRIPTION = i18n.translate('xpack.cases.settings.knowledge.description', {
  defaultMessage:
    'Publish what analysts decided on closed cases, so agents triage the next similar alert with that context.',
});
const PUBLISH = i18n.translate('xpack.cases.settings.knowledge.publish', {
  defaultMessage: 'Publish closed-case outcomes to the context engine',
});
const AI_INDEX = i18n.translate('xpack.cases.settings.knowledge.aiIndex', {
  defaultMessage: 'AI index',
});
const AI_INDEX_HELP = i18n.translate('xpack.cases.settings.knowledge.aiIndexHelp', {
  defaultMessage:
    'Agents read it through the context engine tools. The case view shows matches as Prior outcomes.',
});
const INCLUDES = i18n.translate('xpack.cases.settings.knowledge.includes', {
  defaultMessage: 'What each outcome includes',
});
const RESTRICTED_NOTE = i18n.translate('xpack.cases.settings.knowledge.restrictedNote', {
  defaultMessage: 'Restricted cases are never published. Reopening a case removes its outcome.',
});
const CONTEXT_ENGINE_OFF = i18n.translate('xpack.cases.settings.knowledge.contextEngineOff', {
  defaultMessage: 'Turn on the context engine in Advanced settings to publish outcomes.',
});
const INCLUDED_FIELDS = [
  i18n.translate('xpack.cases.settings.knowledge.field.closeReason', {
    defaultMessage: 'Close reason',
  }),
  i18n.translate('xpack.cases.settings.knowledge.field.aiVerdict', {
    defaultMessage: 'AI verdict',
  }),
  i18n.translate('xpack.cases.settings.knowledge.field.humanVerdict', {
    defaultMessage: 'Human verdict',
  }),
  i18n.translate('xpack.cases.settings.knowledge.field.severity', { defaultMessage: 'Severity' }),
  i18n.translate('xpack.cases.settings.knowledge.field.template', { defaultMessage: 'Template' }),
  i18n.translate('xpack.cases.settings.knowledge.field.ruleNames', {
    defaultMessage: 'Rule names',
  }),
  i18n.translate('xpack.cases.settings.knowledge.field.hosts', { defaultMessage: 'Hosts' }),
  i18n.translate('xpack.cases.settings.knowledge.field.users', { defaultMessage: 'Users' }),
  i18n.translate('xpack.cases.settings.knowledge.field.observables', {
    defaultMessage: 'Observables',
  }),
  i18n.translate('xpack.cases.settings.knowledge.field.closingNotes', {
    defaultMessage: 'Closing notes',
  }),
];

export interface KnowledgeSectionProps {
  publishOutcomes: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
  contextEngineEnabled: boolean;
}

/** Settings for publishing closed-case outcomes to the context engine. */
export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  publishOutcomes,
  onChange,
  disabled,
  contextEngineEnabled,
}) => (
  <>
    {!contextEngineEnabled ? (
      <>
        <EuiCallOut
          announceOnMount
          size="s"
          color="warning"
          iconType="warning"
          title={CONTEXT_ENGINE_OFF}
          data-test-subj="cases-knowledge-context-engine-off"
        />
        <EuiSpacer size="m" />
      </>
    ) : null}
    <EuiSwitch
      label={PUBLISH}
      checked={contextEngineEnabled && publishOutcomes}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled || !contextEngineEnabled}
      data-test-subj="cases-knowledge-publish-switch"
    />
    <EuiSpacer size="m" />
    <EuiFormRow label={AI_INDEX} helpText={AI_INDEX_HELP} fullWidth>
      <EuiText size="s">
        <EuiCode data-test-subj="cases-knowledge-ai-index">{CASES_OUTCOMES_AI_INDEX_ID}</EuiCode>
      </EuiText>
    </EuiFormRow>
    <EuiFormRow label={INCLUDES} fullWidth>
      <EuiBadgeGroup gutterSize="s" data-test-subj="cases-knowledge-includes">
        {INCLUDED_FIELDS.map((field) => (
          <EuiBadge key={field} color="hollow">
            {field}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    </EuiFormRow>
    <EuiSpacer size="m" />
    <EuiCallOut
      size="s"
      color="primary"
      iconType="info"
      title={RESTRICTED_NOTE}
      data-test-subj="cases-knowledge-restricted-note"
    />
  </>
);
KnowledgeSection.displayName = 'KnowledgeSection';
