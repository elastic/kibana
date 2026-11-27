/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiLink,
  EuiPopover,
  EuiProgress,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButton } from '@kbn/ui-ai-components';
import type { MergeCasesPreviewResponse, MergePreviewCase } from '../../../../common/types/api';
import { CaseStatuses } from '../../../../common/types/domain';
import { useResolveMergeConflicts } from '../use_resolve_merge_conflicts';
import type { MergeFieldChoices, MergeFieldKey } from '../utils';
import { toAiReasons, toChoicesFromFields } from '../utils';
import { getCaseRef } from '../value_cards/case_hover_card';
import type { DifferencesSummary } from '../value_cards/field_state';
import { getFillableKeys, getFillFromCaseChoices } from '../value_cards/field_state';
import * as i18n from '../value_cards/translations';

const MENU_ROW_HEIGHT = 36;
const MENU_VISIBLE_ROWS = 8;

/** "Fill from a case ▾": a filterable list of the cases; picking one fills every field from it. */
const FillFromCaseMenu: React.FC<{
  cases: MergePreviewCase[];
  count: number;
  onFill: (caseId: string) => void;
  isDisabled: boolean;
}> = ({ cases, count, onFill, isDisabled }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      cases.map((theCase) => {
        const ref = getCaseRef(theCase);
        return {
          key: theCase.id,
          label: theCase.title,
          searchableLabel: `${ref} ${theCase.title}`,
          prepend: <EuiBadge color="hollow">{ref}</EuiBadge>,
          append:
            theCase.status === CaseStatuses.closed ? <Status status={theCase.status} /> : undefined,
          'data-test-subj': `merge-fill-from-case-option-${theCase.id}`,
        };
      }),
    [cases]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      aria-label={i18n.FILL_FROM_CASE}
      button={
        <EuiButton
          size="s"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          isDisabled={isDisabled}
          aria-expanded={isOpen}
          data-test-subj="merge-fill-from-case-button"
        >
          {i18n.FILL_FROM_CASE}
        </EuiButton>
      }
    >
      <div
        css={css`
          width: 400px;
        `}
        data-test-subj="merge-fill-from-case-menu"
      >
        <EuiSelectable
          aria-label={i18n.FILL_FROM_CASE}
          searchable
          singleSelection
          options={options}
          onChange={(next) => {
            const picked = next.find(({ checked }) => checked === 'on');
            if (picked?.key != null) {
              setIsOpen(false);
              onFill(picked.key);
            }
          }}
          searchProps={{
            placeholder: i18n.FILTER_CASES(cases.length),
            compressed: true,
            'data-test-subj': 'merge-fill-from-case-search',
          }}
          listProps={{ bordered: false, showIcons: false, rowHeight: MENU_ROW_HEIGHT }}
          height={Math.min(cases.length, MENU_VISIBLE_ROWS) * MENU_ROW_HEIGHT}
        >
          {(list, search) => (
            <>
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: ${euiTheme.size.s};
                  padding: ${euiTheme.size.s};
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  border-bottom: ${euiTheme.border.thin};
                `}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.FILL_FROM_CASE_HELP(count)}
                </EuiText>
                {search}
              </div>
              {list}
            </>
          )}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
FillFromCaseMenu.displayName = 'FillFromCaseMenu';

export interface ConflictsBarProps {
  preview: MergeCasesPreviewResponse;
  /** The cases being merged, as the merge request sends them. */
  caseIds: string[];
  destinationCaseId?: string;
  choices: MergeFieldChoices;
  summary: DifferencesSummary;
  isAiAvailable: boolean;
  isDisabled: boolean;
  onApplyChoices: (choices: MergeFieldChoices) => void;
  onApplyAiResolution: (
    choices: MergeFieldChoices,
    reasons: ReadonlyMap<MergeFieldKey, string>
  ) => void;
  /** Brings a field into view, such as the next one still open. */
  onGoToField: (key: MergeFieldKey) => void;
}

/**
 * The Conflicts step's bar, pinned above the fields so it stays in view while they scroll: how many
 * conflicts are settled, a jump to the next open one, and the two ways to settle them all at once.
 * It holds the AI request, so leaving the step drops an answer still on its way.
 */
export const ConflictsBar: React.FC<ConflictsBarProps> = ({
  preview,
  caseIds,
  destinationCaseId,
  choices,
  summary,
  isAiAvailable,
  isDisabled,
  onApplyChoices,
  onApplyAiResolution,
  onGoToField,
}) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');
  const { mutate: resolveWithAi, isLoading: isResolving } = useResolveMergeConflicts();
  const { total, resolved, blocking } = summary;
  const [next] = blocking;
  // Every field that differs, set or not: filling again replaces them all.
  const fillableCount = getFillableKeys(preview, choices).length;
  const areShortcutsDisabled = isDisabled || isResolving;

  const onResolveWithAi = () =>
    resolveWithAi(
      { caseIds, ...(destinationCaseId != null ? { destinationCaseId } : {}) },
      {
        onSuccess: (response) =>
          onApplyAiResolution(
            toChoicesFromFields(preview, response.fields),
            toAiReasons(response.reasons)
          ),
      }
    );

  return (
    <div
      css={css`
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: ${euiTheme.size.s} ${euiTheme.size.m};
        padding: ${euiTheme.size.m} ${euiTheme.size.l};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${euiTheme.border.thin};
        ${shadow}
      `}
      data-test-subj="merge-conflicts-bar"
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          flex: 1 1 240px;
          max-width: 320px;
          min-width: 0;
        `}
      >
        <div
          css={css`
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: ${euiTheme.size.s};
            white-space: nowrap;
          `}
        >
          <EuiText size="s" role="status" data-test-subj="merge-conflicts-progress">
            <FormattedMessage
              id="xpack.cases.mergeCases.differences.progress"
              defaultMessage="<b>{settled} of {total}</b> settled"
              values={{
                settled: resolved,
                total,
                b: (chunks) => <strong>{chunks}</strong>,
              }}
            />
          </EuiText>
          {next != null ? (
            <EuiText size="xs">
              <EuiLink
                color="primary"
                onClick={() => onGoToField(next.key)}
                data-test-subj="merge-conflicts-next"
              >
                {i18n.NEXT_FIELD(next.label)}
              </EuiLink>
            </EuiText>
          ) : null}
        </div>
        <EuiProgress
          value={resolved}
          max={Math.max(total, 1)}
          size="s"
          color={blocking.length === 0 ? 'success' : 'primary'}
          aria-hidden={true}
        />
      </div>
      {fillableCount > 0 ? (
        <div
          css={css`
            display: flex;
            gap: ${euiTheme.size.s};
            align-items: center;
          `}
        >
          {isAiAvailable ? (
            <EuiToolTip content={i18n.RESOLVE_WITH_AI_HELP}>
              <AiButton
                size="s"
                iconType="sparkles"
                onClick={onResolveWithAi}
                isLoading={isResolving}
                isDisabled={isDisabled}
                data-test-subj="merge-resolve-with-ai-button"
              >
                {isResolving ? i18n.RESOLVING_WITH_AI : i18n.RESOLVE_WITH_AI}
              </AiButton>
            </EuiToolTip>
          ) : null}
          <FillFromCaseMenu
            cases={preview.cases}
            count={fillableCount}
            isDisabled={areShortcutsDisabled}
            onFill={(caseId) => onApplyChoices(getFillFromCaseChoices(preview, choices, caseId))}
          />
        </div>
      ) : null}
    </div>
  );
};
ConflictsBar.displayName = 'ConflictsBar';
