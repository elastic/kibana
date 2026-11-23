/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  MergeAttachmentSummary,
  MergeCasesPreviewResponse,
  MergeNotCopiedReason,
  MergePreviewCase,
  MergeStayingAttachments,
} from '../../../../common/types/api';
import type {
  LimitedChoiceKind,
  MergeChoiceKind,
  SelectedAttachmentSummary,
  SelectedAttachments,
} from '../utils';
import { getExclusionsKeepingNewest, getRoomForAlerts } from '../utils';
import { CaseRef } from '../value_cards/case_refs';
import type { SetIncluded } from './attachment_choices';
import {
  AlertChoicesByCase,
  AlertChoicesByRule,
  AttackChoices,
  countIncluded,
  EventChoices,
  ObservableChoices,
  OtherChoices,
} from './attachment_choices';
import * as i18n from '../translations';

const ATTACHMENT_KINDS: ReadonlyArray<{ kind: MergeChoiceKind; title: string }> = [
  { kind: 'alerts', title: i18n.ALERTS },
  { kind: 'attacks', title: i18n.ATTACKS },
  { kind: 'events', title: i18n.EVENTS },
  { kind: 'observables', title: i18n.OBSERVABLES },
  { kind: 'other', title: i18n.OTHER_ATTACHMENTS },
];

const FILES_AND_COMMENTS_ROW = 'filesAndComments';
type RowId = MergeChoiceKind | typeof FILES_AND_COMMENTS_ROW;

const NOT_COPIED_MESSAGES: Record<MergeNotCopiedReason, (count: number) => string> = {
  alertCaseLimit: i18n.NOT_COPIED_ALERT_CASE_LIMIT,
  alertNotAuthorized: i18n.NOT_COPIED_ALERT_NOT_AUTHORIZED,
  license: i18n.NOT_COPIED_LICENSE,
};

const getNotCopiedMessages = (summary: MergeAttachmentSummary): string[] =>
  summary.notCopied
    .filter(({ count }) => count > 0)
    .map(({ reason, count }) => NOT_COPIED_MESSAGES[reason](count));

const getMeta = (summary: SelectedAttachmentSummary, destinationRef?: string): string =>
  [
    i18n.TO_COPY(summary.toCopy),
    summary.excluded > 0 ? i18n.LEFT_OUT(summary.excluded) : null,
    summary.duplicates > 0 ? i18n.DUPLICATES_SKIPPED(summary.duplicates) : null,
    destinationRef != null && summary.existing > 0
      ? i18n.ALREADY_IN_DESTINATION(summary.existing, destinationRef)
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');

const countInCase = ({ byCase }: MergeStayingAttachments, caseId: string): number =>
  byCase.find((entry) => entry.caseId === caseId)?.count ?? 0;

type AlertMode = 'rule' | 'case' | 'newest';

/** Only a kind over its limit gets a badge; the rest need nothing from the user. */
const KindStatusBadge = React.memo<{ summary: SelectedAttachmentSummary; kind: MergeChoiceKind }>(
  ({ summary, kind }) => {
    if (summary.max == null || summary.overBy <= 0) {
      return null;
    }
    return (
      <EuiBadge
        color="warning"
        iconType="warning"
        data-test-subj={`merge-cases-attachments-${kind}-over-limit`}
      >
        {i18n.OVER_LIMIT_BADGE(summary.toCopy + summary.existing, summary.max)}
      </EuiBadge>
    );
  }
);
KindStatusBadge.displayName = 'KindStatusBadge';

const RowHeader = React.memo<{ icon: React.ReactNode; title: string; meta: string }>(
  ({ icon, title, meta }) => (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          min-width: 140px;
        `}
      >
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {meta}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
RowHeader.displayName = 'RowHeader';

interface AttachmentRowProps {
  rowId: RowId;
  header: React.ReactNode;
  extraAction?: React.ReactNode;
  /** What the row opens to; without it the row has nothing to list and doesn't open. */
  body?: React.ReactNode;
  isOpen: boolean;
  onToggle: (rowId: RowId, isOpen: boolean) => void;
}

/** One kind of attachment: its counts, opening to the items themselves. */
const AttachmentRow = React.memo<AttachmentRowProps>(
  ({ rowId, header, extraAction, body, isOpen, onToggle }) => {
    const { euiTheme } = useEuiTheme();
    const accordionId = useGeneratedHtmlId({ prefix: `mergeAttachments-${rowId}` });

    if (body == null) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem
            css={css`
              min-width: 0;
              /* Lines the counts up with the rows that have an arrow. */
              padding-left: calc(${euiTheme.size.l} + ${euiTheme.size.xs});
            `}
          >
            {header}
          </EuiFlexItem>
          {extraAction != null ? <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem> : null}
        </EuiFlexGroup>
      );
    }

    return (
      <EuiAccordion
        id={accordionId}
        arrowDisplay="left"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(nextIsOpen) => onToggle(rowId, nextIsOpen)}
        buttonContent={header}
        buttonProps={{
          css: css`
            min-width: 0;
          `,
          'data-test-subj': `merge-cases-attachments-${rowId}-toggle`,
        }}
        extraAction={extraAction}
      >
        {isOpen ? (
          <>
            <EuiSpacer size="m" />
            {body}
          </>
        ) : null}
      </EuiAccordion>
    );
  }
);
AttachmentRow.displayName = 'AttachmentRow';

interface StayingRow {
  caseId: string;
  files: number;
  comments: number;
}

const FilesAndCommentsByCase = React.memo<{
  files: MergeStayingAttachments;
  comments: MergeStayingAttachments;
  cases: MergePreviewCase[];
}>(({ files, comments, cases }) => {
  const rows = useMemo<StayingRow[]>(
    () =>
      cases
        .map(({ id }) => ({
          caseId: id,
          files: countInCase(files, id),
          comments: countInCase(comments, id),
        }))
        .filter((row) => row.files + row.comments > 0),
    [cases, comments, files]
  );
  const columns = useMemo<Array<EuiBasicTableColumn<StayingRow>>>(
    () => [
      {
        field: 'caseId',
        name: i18n.FROM_COLUMN,
        width: '110px',
        render: (caseId: string) => <CaseRef caseId={caseId} cases={cases} />,
      },
      {
        name: i18n.TITLE_FIELD,
        truncateText: true,
        render: ({ caseId }: StayingRow) => cases.find(({ id }) => id === caseId)?.title ?? '',
      },
      { field: 'files', name: i18n.FILES_COLUMN, width: '80px', align: 'right' },
      { field: 'comments', name: i18n.COMMENTS_COLUMN, width: '100px', align: 'right' },
    ],
    [cases]
  );

  return (
    <EuiBasicTable
      compressed
      tableCaption={i18n.FILES_AND_COMMENTS}
      items={rows}
      itemId="caseId"
      columns={columns}
      data-test-subj="merge-cases-files-comments-by-case"
    />
  );
});
FilesAndCommentsByCase.displayName = 'FilesAndCommentsByCase';

export interface AttachmentsStepProps {
  preview: MergeCasesPreviewResponse;
  /** The preview counts after the user's exclusions. */
  attachments: SelectedAttachments;
  excludedKeys: ReadonlySet<string>;
  onChangeExclusions: (excludedKeys: ReadonlySet<string>) => void;
  /** Set when merging into one of the cases. */
  destinationRef?: string;
  isDisabled: boolean;
}

/**
 * Step 3: what the merged case gets. Every row opens to its items; a kind over its limit opens on
 * its own, with the items to leave out, and one button keeps the newest of every such kind.
 */
export const AttachmentsStep = React.memo<AttachmentsStepProps>(
  ({ preview, attachments, excludedKeys, onChangeExclusions, destinationRef, isDisabled }) => {
    const { euiTheme } = useEuiTheme();
    const rowPadding = css`
      padding: ${euiTheme.size.m};
    `;
    const { choices, cases } = preview;
    const [alertMode, setAlertMode] = useState<AlertMode>('rule');

    // The preview never carries the user's exclusions, so a kind stays over its limit here even
    // after the user leaves enough out, and its row keeps its choices.
    const isOverLimit = (kind: MergeChoiceKind) => preview.attachments[kind].overBy > 0;
    const presentKinds = ATTACHMENT_KINDS.filter(
      ({ kind }) => attachments[kind].total > 0 || preview.attachments[kind].notCopied.length > 0
    );

    const [openRows, setOpenRows] = useState<ReadonlySet<RowId>>(
      () => new Set(presentKinds.map(({ kind }) => kind).filter(isOverLimit))
    );

    const toggleRow = useCallback((rowId: RowId, isOpen: boolean) => {
      setOpenRows((current) => {
        const next = new Set(current);
        if (isOpen) {
          next.add(rowId);
        } else {
          next.delete(rowId);
        }
        return next;
      });
    }, []);

    const setIncluded = useCallback<SetIncluded>(
      (keys, isIncluded) => {
        const next = new Set(excludedKeys);
        for (const key of keys) {
          if (isIncluded) {
            next.delete(key);
          } else {
            next.add(key);
          }
        }
        onChangeExclusions(next);
      },
      [excludedKeys, onChangeExclusions]
    );

    const alertsRoom = getRoomForAlerts(preview.attachments.alerts, choices, excludedKeys);
    const hasKindOverLimit = presentKinds.some(({ kind }) => isOverLimit(kind));
    const isWithinLimits = presentKinds.every(({ kind }) => attachments[kind].overBy <= 0);

    const keepNewest = useCallback(
      (kinds?: readonly LimitedChoiceKind[]) =>
        onChangeExclusions(getExclusionsKeepingNewest(preview, excludedKeys, kinds)),
      [excludedKeys, onChangeExclusions, preview]
    );

    const onAlertModeChange = useCallback(
      (mode: string) => {
        setAlertMode(mode as AlertMode);
        if (mode === 'newest') {
          keepNewest(['alerts']);
        }
      },
      [keepNewest]
    );

    const choiceProps = { excludedKeys, setIncluded, cases, isDisabled };
    // Alerts an attack brought are listed with the attack, not among the alerts.
    const alertsWithAttacks = Math.max(
      0,
      attachments.alerts.toCopy - countIncluded(choices.alerts, excludedKeys)
    );

    const renderOverLimitBody = (kind: MergeChoiceKind) => {
      const summary = attachments[kind];

      if (kind === 'alerts') {
        const total = preview.attachments.alerts.toCopy + preview.attachments.alerts.existing;
        return (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  color={summary.overBy > 0 ? 'warning' : 'success'}
                  data-test-subj="merge-cases-attachments-alerts-status"
                >
                  {summary.overBy > 0
                    ? i18n.ALERTS_OVER_LIMIT_INLINE(total, summary.max ?? 0, summary.overBy)
                    : i18n.CHOICES_WITHIN_LIMIT}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.LEAVE_OUT_BY}
                  buttonSize="compressed"
                  isDisabled={isDisabled}
                  idSelected={alertMode}
                  onChange={onAlertModeChange}
                  options={[
                    { id: 'rule', label: i18n.BY_RULE, 'data-test-subj': 'merge-alerts-by-rule' },
                    { id: 'case', label: i18n.BY_CASE, 'data-test-subj': 'merge-alerts-by-case' },
                    {
                      id: 'newest',
                      label: i18n.KEEP_NEWEST(alertsRoom ?? 0),
                      'data-test-subj': 'merge-alerts-keep-newest',
                    },
                  ]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {alertMode === 'rule' ? (
              <AlertChoicesByRule {...choiceProps} items={choices.alerts} />
            ) : alertMode === 'case' ? (
              <AlertChoicesByCase {...choiceProps} items={choices.alerts} />
            ) : (
              <EuiText size="s" color="subdued" data-test-subj="merge-alerts-keep-newest-result">
                {i18n.KEEP_NEWEST_RESULT(
                  alertsRoom ?? 0,
                  Math.max(0, choices.alerts.length - (alertsRoom ?? 0))
                )}
              </EuiText>
            )}
            {choices.attacks.length > 0 ? (
              <>
                <EuiSpacer size="m" />
                <AttackChoices {...choiceProps} items={choices.attacks} />
              </>
            ) : null}
          </>
        );
      }

      return (
        <>
          <EuiText size="s" color={summary.overBy > 0 ? 'warning' : 'success'}>
            {summary.overBy > 0
              ? i18n.KIND_OVER_LIMIT_INLINE(
                  kind,
                  preview.attachments[kind].toCopy + preview.attachments[kind].existing,
                  summary.max ?? 0,
                  summary.overBy
                )
              : i18n.CHOICES_WITHIN_LIMIT}
          </EuiText>
          <EuiSpacer size="s" />
          {kind === 'observables' ? (
            <ObservableChoices {...choiceProps} items={choices.observables} />
          ) : kind === 'other' ? (
            <OtherChoices {...choiceProps} items={choices.other} />
          ) : null}
        </>
      );
    };

    const renderItems = (kind: MergeChoiceKind) => {
      switch (kind) {
        case 'alerts':
          return <AlertChoicesByRule {...choiceProps} items={choices.alerts} />;
        case 'attacks':
          return <AttackChoices {...choiceProps} items={choices.attacks} />;
        case 'events':
          return <EventChoices {...choiceProps} items={choices.events} />;
        case 'observables':
          return <ObservableChoices {...choiceProps} items={choices.observables} />;
        case 'other':
          return <OtherChoices {...choiceProps} items={choices.other} />;
      }
    };

    const renderBody = (kind: MergeChoiceKind): React.ReactNode | undefined => {
      if (isOverLimit(kind)) {
        return renderOverLimitBody(kind);
      }
      if (choices[kind].length === 0) {
        return undefined;
      }
      return (
        <>
          {renderItems(kind)}
          {kind === 'alerts' && alertsWithAttacks > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="merge-cases-attachments-alerts-with-attacks"
              >
                {i18n.ALERTS_WITH_ATTACKS(alertsWithAttacks)}
              </EuiText>
            </>
          ) : null}
        </>
      );
    };

    const { files, comments } = attachments;
    const hasFilesOrComments = files.total > 0 || comments.total > 0;

    return (
      <div data-test-subj="merge-cases-attachments-step">
        {hasKindOverLimit ? (
          <>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="m"
              responsive={false}
              wrap
            >
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  color={isWithinLimits ? 'success' : 'warning'}
                  data-test-subj="merge-cases-attachments-limits-status"
                >
                  {isWithinLimits ? i18n.WITHIN_LIMITS : i18n.OVER_LIMITS_HINT}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="clock"
                  isDisabled={isDisabled}
                  onClick={() => keepNewest()}
                  data-test-subj="merge-cases-attachments-keep-newest"
                >
                  {i18n.KEEP_NEWEST_UP_TO_LIMITS}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiPanel
          hasBorder
          paddingSize="none"
          css={css`
            overflow: hidden;
          `}
        >
          {presentKinds.length === 0 ? (
            <div css={rowPadding}>
              <EuiText size="s" color="subdued" data-test-subj="merge-cases-no-attachments">
                {i18n.NO_ATTACHMENTS}
              </EuiText>
            </div>
          ) : null}
          {presentKinds.map(({ kind, title }, position) => {
            const summary = attachments[kind];
            const notCopiedMessages = getNotCopiedMessages(preview.attachments[kind]);
            return (
              <React.Fragment key={kind}>
                {position > 0 ? <EuiHorizontalRule margin="none" /> : null}
                <div
                  css={[
                    rowPadding,
                    isOverLimit(kind)
                      ? css`
                          border-left: ${euiTheme.border.width.thick} solid
                            ${summary.overBy > 0
                              ? euiTheme.colors.warning
                              : euiTheme.colors.success};
                        `
                      : undefined,
                  ]}
                  data-test-subj={`merge-cases-attachments-${kind}`}
                >
                  <AttachmentRow
                    rowId={kind}
                    header={
                      <RowHeader
                        icon={
                          <EuiIcon
                            type={summary.overBy > 0 ? 'warning' : 'checkCircleFill'}
                            color={summary.overBy > 0 ? 'warning' : 'success'}
                            aria-hidden={true}
                          />
                        }
                        title={title}
                        meta={getMeta(summary, destinationRef)}
                      />
                    }
                    extraAction={<KindStatusBadge summary={summary} kind={kind} />}
                    body={renderBody(kind)}
                    isOpen={openRows.has(kind)}
                    onToggle={toggleRow}
                  />
                  {notCopiedMessages.map((message) => (
                    <EuiText
                      key={message}
                      size="xs"
                      color="subdued"
                      data-test-subj={`merge-cases-attachments-${kind}-not-copied`}
                    >
                      <EuiIcon type="info" aria-hidden={true} /> {message}
                    </EuiText>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
          {hasFilesOrComments ? (
            <>
              {presentKinds.length > 0 ? <EuiHorizontalRule margin="none" /> : null}
              <div css={rowPadding} data-test-subj="merge-cases-files-comments-stay">
                <AttachmentRow
                  rowId={FILES_AND_COMMENTS_ROW}
                  header={
                    <RowHeader
                      icon={<EuiIcon type="info" color="subdued" aria-hidden={true} />}
                      title={i18n.FILES_AND_COMMENTS}
                      meta={i18n.FILES_AND_COMMENTS_STAY(files.total, comments.total)}
                    />
                  }
                  body={<FilesAndCommentsByCase files={files} comments={comments} cases={cases} />}
                  isOpen={openRows.has(FILES_AND_COMMENTS_ROW)}
                  onToggle={toggleRow}
                />
              </div>
            </>
          ) : null}
        </EuiPanel>
      </div>
    );
  }
);
AttachmentsStep.displayName = 'AttachmentsStep';
