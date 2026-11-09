/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noop } from 'lodash';
import { EuiFormRow, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CaseUI } from '../../../../common/ui/types';
import type { CaseVerdict } from '../../../../common/types/domain';
import { caseViewSectionRegistry } from '../../../client/case_view_sections';
import { VERDICT_LABELS } from '../../verdict/translations';
import { useCasesConfig } from '../../../common/lib/kibana';

const NOTES_LABEL = i18n.translate('xpack.cases.closeCaseModal.notesLabel', {
  defaultMessage: 'Closing notes',
});
const NOTES_OPTIONAL = i18n.translate('xpack.cases.closeCaseModal.optional', {
  defaultMessage: 'Optional',
});
const NOTES_PLACEHOLDER = i18n.translate('xpack.cases.closeCaseModal.notesPlaceholder', {
  defaultMessage: 'What happened and what you did',
});
const NOTES_HELP_PUBLISHED = i18n.translate('xpack.cases.closeCaseModal.notesHelp.published', {
  defaultMessage: 'Added to the case as a comment and included in the published case outcome.',
});
const NOTES_HELP_RESTRICTED = i18n.translate('xpack.cases.closeCaseModal.notesHelp.restricted', {
  defaultMessage:
    "Added to the case as a comment. This case is restricted, so its outcome isn't published to knowledge.",
});
const NOTES_HELP_COMMENT = i18n.translate('xpack.cases.closeCaseModal.notesHelp.comment', {
  defaultMessage: 'Added to the case as a comment.',
});

const CLOSE_REASON_VERDICTS: Record<string, CaseVerdict> = {
  true_positive: 'true_positive',
  false_positive: 'false_positive',
  benign_positive: 'benign_positive',
};

const verdictLine = (closeReason: string | undefined, aiVerdict: CaseVerdict | undefined) => {
  if (closeReason == null) {
    return undefined;
  }
  const verdict = CLOSE_REASON_VERDICTS[closeReason];
  if (verdict == null) {
    return i18n.translate('xpack.cases.closeCaseModal.humanVerdict.none', {
      defaultMessage: 'No human verdict is set for this reason. You can set one on the case.',
    });
  }
  const verdictLabel = VERDICT_LABELS[verdict];
  if (aiVerdict == null) {
    return i18n.translate('xpack.cases.closeCaseModal.humanVerdict.set', {
      defaultMessage: 'Sets the human verdict to {verdict}.',
      values: { verdict: verdictLabel },
    });
  }
  return aiVerdict === verdict
    ? i18n.translate('xpack.cases.closeCaseModal.humanVerdict.agrees', {
        defaultMessage: 'Sets the human verdict to {verdict}. That agrees with the AI verdict.',
        values: { verdict: verdictLabel },
      })
    : i18n.translate('xpack.cases.closeCaseModal.humanVerdict.differs', {
        defaultMessage:
          'Sets the human verdict to {verdict}. That differs from the AI verdict ({aiVerdict}).',
        values: { verdict: verdictLabel, aiVerdict: VERDICT_LABELS[aiVerdict] },
      });
};

/**
 * What closing does beyond the status: the human verdict the reason sets, and the side effects
 * other plugins register (closing linked investigations).
 */
export const CloseOutcome: React.FC<{
  caseData: CaseUI;
  closeReason?: string;
  closeLinkedInvestigations: boolean;
  setCloseLinkedInvestigations: (value: boolean) => void;
  closingNotes: string;
  setClosingNotes: (value: string) => void;
}> = ({
  caseData,
  closeReason,
  closeLinkedInvestigations,
  setCloseLinkedInvestigations,
  closingNotes,
  setClosingNotes,
}) => {
  const { knowledgeEnabled } = useCasesConfig();
  const line = verdictLine(closeReason, caseData.aiVerdict?.verdict);
  const notesHelp = !knowledgeEnabled
    ? NOTES_HELP_COMMENT
    : caseData.access?.mode === 'restricted'
    ? NOTES_HELP_RESTRICTED
    : NOTES_HELP_PUBLISHED;
  const sections = caseViewSectionRegistry.getVisible('closeModal', caseData);

  return (
    <>
      <div aria-live="polite">
        {line ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj="close-case-modal-verdict-line">
              {line}
            </EuiText>
          </>
        ) : null}
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow label={NOTES_LABEL} labelAppend={NOTES_OPTIONAL} helpText={notesHelp} fullWidth>
        <EuiTextArea
          fullWidth
          rows={3}
          value={closingNotes}
          placeholder={NOTES_PLACEHOLDER}
          onChange={(event) => setClosingNotes(event.target.value)}
          data-test-subj="close-case-notes"
        />
      </EuiFormRow>
      {sections.map((section) => (
        <React.Fragment key={section.id}>
          <EuiSpacer size="m" />
          {section.render({
            caseData,
            canUpdate: true,
            refreshCase: noop,
            closeLinkedInvestigations,
            setCloseLinkedInvestigations,
          })}
        </React.Fragment>
      ))}
    </>
  );
};
CloseOutcome.displayName = 'CloseOutcome';
