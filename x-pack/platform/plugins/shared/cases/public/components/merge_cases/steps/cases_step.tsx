/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelative } from '@kbn/i18n-react';
import { Status } from '@kbn/cases-components';
import { MAX_CASES_TO_MERGE } from '../../../../common/constants';
import type { MergePreviewCase } from '../../../../common/types/api';
import { CaseStatuses } from '../../../../common/types/domain';
import { SeverityHealth } from '../../severity/config';
import { MergeAddCases } from '../merge_add_cases';
import { CaseRef } from '../value_cards/case_refs';
import type { MergeCaseSummary } from '../use_merge_flyout_state';
import type { MergeInto } from '../utils';
import { getCaseReference } from '../utils';
import { MergeIntoChoice } from './merge_into_choice';
import * as i18n from '../translations';

export interface CasesStepBarProps {
  cases: MergeCaseSummary[];
  mergeInto: MergeInto;
  canCreate: boolean;
  onSetMergeInto: (mergeInto: MergeInto) => void;
  /** Without the tiles' pictures, while the cases below scroll. */
  isCompact: boolean;
  isDisabled: boolean;
}

export interface CasesStepProps {
  /** The selected cases, with the preview's current status and counts once it arrives. */
  cases: MergeCaseSummary[];
  /** The preview's cases, for each case's description, template, dates and number card. */
  previewCases: MergePreviewCase[];
  mergeInto: MergeInto;
  destinationCaseId?: string;
  onSetDestination: (caseId?: string) => void;
  onAddCase: (theCase: MergeCaseSummary) => void;
  onRemoveCase: (caseId: string) => void;
  isDisabled: boolean;
}

const minWidthZero = css`
  min-width: 0;
`;

const descriptionClamp = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-line;
`;

/**
 * A case in the merge: its number, title, the start of its description and its template on the
 * left; status, severity, alerts and when it was opened (or closed) beside them. The description,
 * template and dates arrive with the preview.
 */
const CaseCard: React.FC<{
  theCase: MergeCaseSummary;
  /** The preview's cases, for the case number's card. */
  previewCases: MergePreviewCase[];
  previewCase?: MergePreviewCase;
  /** Set while the user picks the case to keep, when a closed case can't be picked. */
  isKeepChoice: boolean;
}> = ({ theCase, previewCases, previewCase, isKeepChoice }) => {
  const { euiTheme } = useEuiTheme();
  const isClosed = theCase.status === CaseStatuses.closed;
  const cannotKeep = isKeepChoice && isClosed;
  const description = previewCase?.description.trim() ?? '';
  const when = isClosed ? previewCase?.closedAt : previewCase?.createdAt;
  const facts: Array<{ title: string; value: React.ReactNode }> = [
    { title: i18n.FACT_STATUS, value: <Status status={theCase.status} /> },
    {
      title: i18n.FACT_SEVERITY,
      value: <SeverityHealth severity={theCase.severity} textSize="xs" />,
    },
    { title: i18n.FACT_ALERTS, value: theCase.totalAlerts },
    ...(when != null
      ? [
          {
            title: isClosed ? i18n.FACT_CLOSED : i18n.FACT_OPENED,
            value: <FormattedRelative value={new Date(when)} />,
          },
        ]
      : []),
  ];

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="flexStart"
      responsive={false}
      data-test-subj={`merge-cases-case-meta-${theCase.id}`}
    >
      <EuiFlexItem css={minWidthZero}>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {theCase.incrementalId != null ? (
                <EuiFlexItem grow={false}>
                  {/* Opens the case's card; it doesn't pick this case to keep. */}
                  <CaseRef
                    caseId={theCase.id}
                    cases={previewCases}
                    label={getCaseReference(theCase)}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem css={minWidthZero}>
                <EuiText size="s" color={cannotKeep ? 'subdued' : 'default'}>
                  <strong>{theCase.title}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {description.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" css={descriptionClamp}>
                {description}
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {previewCase?.templateName != null ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {previewCase.templateName}
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {cannotKeep ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.CLOSED_CASE_CANNOT_KEEP}
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          width: 172px;
          padding-left: ${euiTheme.size.m};
          border-left: ${euiTheme.border.thin};
        `}
      >
        <dl
          css={css`
            margin: 0;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: ${euiTheme.size.xs} ${euiTheme.size.s};
          `}
          data-test-subj={`merge-cases-case-facts-${theCase.id}`}
        >
          {facts.map(({ title, value }) => (
            <React.Fragment key={title}>
              <dt>
                <EuiText size="xs" color="subdued">
                  {title}
                </EuiText>
              </dt>
              <dd
                css={css`
                  margin: 0;
                  min-width: 0;
                `}
              >
                <EuiText size="xs">{value}</EuiText>
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
CaseCard.displayName = 'CaseCard';

const RemoveCaseButton: React.FC<{
  caseId: string;
  caseRef: string;
  onRemoveCase: (caseId: string) => void;
  isDisabled: boolean;
}> = ({ caseId, caseRef, onRemoveCase, isDisabled }) => (
  <EuiToolTip content={i18n.REMOVE_CASE(caseRef)} disableScreenReaderOutput>
    <EuiButtonIcon
      iconType="cross"
      color="text"
      isDisabled={isDisabled}
      onClick={() => onRemoveCase(caseId)}
      aria-label={i18n.REMOVE_CASE(caseRef)}
      data-test-subj={`merge-cases-remove-${caseId}`}
    />
  </EuiToolTip>
);
RemoveCaseButton.displayName = 'RemoveCaseButton';

/**
 * The Cases step's bar, pinned above the list so it stays in view while the cases scroll: whether
 * to merge into a new case (the default) or one of the cases.
 */
export const CasesStepBar = React.memo<CasesStepBarProps>(
  ({ cases, mergeInto, canCreate, onSetMergeInto, isCompact, isDisabled }) => {
    const { euiTheme } = useEuiTheme();
    const shadow = useEuiShadow('s');

    return (
      <div
        css={css`
          position: relative;
          z-index: ${Number(euiTheme.levels.content) + 1};
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          background: ${euiTheme.colors.backgroundBasePlain};
          border-bottom: ${euiTheme.border.thin};
          ${shadow}
        `}
        data-test-subj="merge-cases-bar"
      >
        <MergeIntoChoice
          mergeInto={mergeInto}
          canCreate={canCreate}
          hasOpenCase={cases.some(({ status }) => status !== CaseStatuses.closed)}
          onSetMergeInto={onSetMergeInto}
          isCompact={isCompact}
          isDisabled={isDisabled}
        />
      </div>
    );
  }
);
CasesStepBar.displayName = 'CasesStepBar';

/**
 * Step 1, below its bar: the cases, as cards to merge or, for an existing case, a choice of which
 * one to keep.
 */
export const CasesStep = React.memo<CasesStepProps>(
  ({
    cases,
    previewCases,
    mergeInto,
    destinationCaseId,
    onSetDestination,
    onAddCase,
    onRemoveCase,
    isDisabled,
  }) => {
    const { euiTheme } = useEuiTheme();
    const radioName = useGeneratedHtmlId({ prefix: 'mergeCasesKeep' });
    const listLabelId = useGeneratedHtmlId({ prefix: 'mergeCasesListLabel' });
    const removeColumn = css`
      width: ${euiTheme.size.l};
    `;
    // Level with the card's first line.
    const removeOffset = css`
      padding-top: ${euiTheme.size.m};
    `;
    const previewById = useMemo(
      () => new Map(previewCases.map((theCase) => [theCase.id, theCase])),
      [previewCases]
    );
    const isPickingCase = mergeInto === 'existing';

    // The same cards either way; only when picking the case to keep are they choices.
    const list = (
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="merge-cases-list">
        {cases.map((theCase) => {
          const caseRef = getCaseReference(theCase);
          const card = (
            <CaseCard
              theCase={theCase}
              previewCases={previewCases}
              previewCase={previewById.get(theCase.id)}
              isKeepChoice={isPickingCase}
            />
          );

          return (
            <EuiFlexItem key={theCase.id}>
              <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                <EuiFlexItem css={minWidthZero}>
                  {isPickingCase ? (
                    <EuiCheckableCard
                      id={`${radioName}-${theCase.id}`}
                      name={radioName}
                      checked={destinationCaseId === theCase.id}
                      disabled={isDisabled || theCase.status === CaseStatuses.closed}
                      onChange={() => onSetDestination(theCase.id)}
                      data-test-subj={`merge-cases-destination-${theCase.id}`}
                      label={card}
                    />
                  ) : (
                    <EuiPanel
                      hasBorder
                      paddingSize="m"
                      data-test-subj={`merge-cases-case-${theCase.id}`}
                    >
                      {card}
                    </EuiPanel>
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false} css={[removeColumn, removeOffset]}>
                  <RemoveCaseButton
                    caseId={theCase.id}
                    caseRef={caseRef}
                    onRemoveCase={onRemoveCase}
                    isDisabled={isDisabled}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );

    return (
      <div data-test-subj="merge-cases-cases-step">
        {/* Above the list, so adding or removing cases never moves the button or its open list. */}
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={css`
            margin-bottom: ${euiTheme.size.s};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" id={listLabelId}>
              <strong>
                {isPickingCase ? i18n.CHOOSE_CASE_TO_MERGE_INTO : i18n.CASES_TO_MERGE}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="merge-cases-counter">
                  {i18n.CASES_COUNTER(cases.length, MAX_CASES_TO_MERGE)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <MergeAddCases
                  selectedCases={cases}
                  owner={cases[0]?.owner}
                  onAddCase={onAddCase}
                  onRemoveCase={onRemoveCase}
                  isDisabled={isDisabled}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isPickingCase ? (
          <fieldset
            aria-labelledby={listLabelId}
            css={css`
              border: 0;
              margin: 0;
              padding: 0;
              min-width: 0;
            `}
            data-test-subj="merge-cases-destination"
          >
            {list}
          </fieldset>
        ) : (
          <section aria-labelledby={listLabelId}>{list}</section>
        )}
      </div>
    );
  }
);
CasesStep.displayName = 'CasesStep';
