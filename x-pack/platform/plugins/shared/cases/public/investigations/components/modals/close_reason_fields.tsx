/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSelectable, EuiText, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
  getDefaultClosingReasonLabel,
} from '@kbn/response-ops-detections-close-reason';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import {
  CLOSE_REASONS,
  CLOSE_REASON_TO_VERDICT,
  MAX_CLOSE_REASON_LENGTH,
  VERDICT_LABELS,
} from '../../../../common/investigations/types';
import type { Verdict } from '../../../../common/investigations/types';
import { MarkdownEditor } from '../../../components/markdown_editor';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

const REASON_ROW_HEIGHT = 32;
/** Lens visualisations are not offered in closing notes. */
const DISABLED_UI_PLUGINS = ['lens'];

/** What closing with this reason does to the human verdict, in the words Cases uses. */
export const getVerdictLine = (
  closeReason: string,
  aiVerdict: Verdict | null | undefined
): string => {
  const verdict = CLOSE_REASON_TO_VERDICT[closeReason];
  if (!verdict) {
    return i18n.CLOSE_VERDICT_LINE_NONE;
  }
  if (!aiVerdict) {
    return i18n.CLOSE_VERDICT_LINE_SETS(VERDICT_LABELS[verdict]);
  }
  return aiVerdict === verdict
    ? i18n.CLOSE_VERDICT_LINE_AGREES(VERDICT_LABELS[verdict])
    : i18n.CLOSE_VERDICT_LINE_DIFFERS(VERDICT_LABELS[verdict], VERDICT_LABELS[aiVerdict]);
};

/**
 * Cases' close reasons plus the ones the space adds in the `securitySolution:detectionsCloseReasons`
 * setting (Cases rejects any other custom reason for this owner).
 */
export const useCloseReasons = (): string[] => {
  const { uiSettings } = useInvestigationsServices();
  return useMemo(() => {
    const spaceReasons = (uiSettings.get<string[]>(DEFAULT_DETECTIONS_CLOSE_REASONS_KEY) ?? [])
      .map((reason) => reason.trim())
      .filter((reason) => reason && reason.length <= MAX_CLOSE_REASON_LENGTH);
    return Array.from(new Set([...CLOSE_REASONS, ...spaceReasons]));
  }, [uiSettings]);
};

export interface CloseReasonSectionProps {
  selectedReason: string | null;
  closeReason: string;
  aiVerdict: Verdict | null | undefined;
  onReasonChange: (reason: string | null) => void;
}

/** The reason picker and the line saying what the reason does. */
export const CloseReasonSection: React.FC<CloseReasonSectionProps> = ({
  selectedReason,
  closeReason,
  aiVerdict,
  onReasonChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const listId = useGeneratedHtmlId({ prefix: 'investigationCloseReasons' });
  const reasons = useCloseReasons();
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      reasons.map((reason) => ({
        key: reason,
        label: getDefaultClosingReasonLabel(reason),
        checked: selectedReason === reason ? ('on' as const) : undefined,
        'data-test-subj': `investigationCloseReason-${reason}`,
      })),
    [reasons, selectedReason]
  );

  return (
    <>
      <EuiFormRow label={i18n.CLOSE_REASON_LABEL} fullWidth>
        <EuiSelectable
          id={listId}
          aria-label={i18n.CLOSE_REASON_LABEL}
          singleSelection="always"
          searchable
          searchProps={{
            placeholder: i18n.CLOSE_REASON_SEARCH_PLACEHOLDER,
            compressed: true,
            'data-test-subj': 'investigationCloseReasonSearch',
          }}
          options={options}
          onChange={(next) => {
            const selected = next.find((option) => option.checked === 'on');
            onReasonChange(selected?.key ?? null);
          }}
          listProps={{ bordered: true, rowHeight: REASON_ROW_HEIGHT }}
          height={REASON_ROW_HEIGHT * Math.min(options.length, 5)}
          data-test-subj="investigationCloseReason"
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFormRow>
      {selectedReason !== null ? (
        <div
          aria-live="polite"
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
          data-test-subj="investigationCloseVerdictLine"
        >
          <EuiText size="s" color="subdued">
            {getVerdictLine(closeReason, aiVerdict)}
          </EuiText>
        </div>
      ) : null}
    </>
  );
};
CloseReasonSection.displayName = 'CloseReasonSection';

export interface CloseNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Overrides the help line under the editor. */
  helpText?: string;
}

/** The optional closing notes editor. */
export const CloseNotesField: React.FC<CloseNotesFieldProps> = ({
  value,
  onChange,
  helpText = i18n.CLOSE_NOTES_HELP,
}) => {
  const notesEditorId = useGeneratedHtmlId({ prefix: 'investigationCloseNotes' });

  return (
    <EuiFormRow
      label={i18n.CLOSE_NOTES_LABEL}
      labelAppend={
        <EuiText size="xs" color="subdued">
          {i18n.OPTIONAL}
        </EuiText>
      }
      helpText={helpText}
      fullWidth
    >
      <MarkdownEditor
        ariaLabel={i18n.CLOSE_NOTES_LABEL}
        editorId={notesEditorId}
        value={value}
        onChange={(next) => onChange(next.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
        height={120}
        disabledUiPlugins={DISABLED_UI_PLUGINS}
        data-test-subj="investigationCloseNotes"
      />
    </EuiFormRow>
  );
};
CloseNotesField.displayName = 'CloseNotesField';
