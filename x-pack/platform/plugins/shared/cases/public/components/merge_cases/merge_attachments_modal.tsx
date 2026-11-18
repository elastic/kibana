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
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type {
  MergeAttachmentChoices,
  MergeCasesPreviewResponse,
  MergePreviewCase,
} from '../../../common/types/api';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import type { MergeChoice, MergeChoiceKind } from './utils';
import {
  MERGE_CHOICE_KINDS,
  applyExclusions,
  getCaseReference,
  getKeysOutsideNewest,
  getRoomForAlerts,
  getRoomForKind,
} from './utils';
import * as i18n from './translations';

type AlertChoice = MergeAttachmentChoices['alerts'][number];
type AttackChoice = MergeAttachmentChoices['attacks'][number];
type EventChoice = MergeAttachmentChoices['events'][number];
type ObservableChoice = MergeAttachmentChoices['observables'][number];
type OtherChoice = MergeAttachmentChoices['other'][number];

type SetIncluded = (keys: string[], isIncluded: boolean) => void;

const KIND_TITLES: Record<MergeChoiceKind, string> = {
  alerts: i18n.ALERTS,
  attacks: i18n.ATTACKS,
  events: i18n.EVENTS,
  observables: i18n.OBSERVABLES,
  other: i18n.OTHER_ATTACHMENTS,
};

const PAGINATION = { pageSizeOptions: [10, 25, 50], initialPageSize: 10 };

const OBSERVABLE_TYPE_LABELS = new Map(
  OBSERVABLE_TYPES_BUILTIN.map(({ key, label }) => [key, label])
);

interface RuleGroup {
  id: string;
  name: string;
  alerts: AlertChoice[];
}

const groupAlertsByRule = (alerts: AlertChoice[]): RuleGroup[] => {
  const groups = new Map<string, RuleGroup>();
  for (const alert of alerts) {
    const { ruleId, ruleName } = alert;
    const id =
      ruleId != null ? `rule:${ruleId}` : ruleName != null ? `name:${ruleName}` : 'unknown';
    const group = groups.get(id) ?? { id, name: ruleName ?? i18n.UNKNOWN_RULE, alerts: [] };
    group.alerts.push(alert);
    groups.set(id, group);
  }
  return [...groups.values()].sort((first, second) => second.alerts.length - first.alerts.length);
};

const countIncluded = (items: MergeChoice[], excludedKeys: ReadonlySet<string>): number =>
  items.filter(({ key }) => !excludedKeys.has(key)).length;

interface SelectColumnArgs<T extends MergeChoice> {
  items: T[];
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  idPrefix: string;
  getLabel: (item: T) => string;
}

/** EUI's built-in selection only covers the current page; this one covers the whole list. */
const buildSelectColumn = <T extends MergeChoice>({
  items,
  excludedKeys,
  setIncluded,
  idPrefix,
  getLabel,
}: SelectColumnArgs<T>): EuiBasicTableColumn<T> => {
  const includedCount = countIncluded(items, excludedKeys);
  return {
    width: '32px',
    name: (
      <EuiCheckbox
        id={`${idPrefix}-all`}
        checked={includedCount === items.length}
        indeterminate={includedCount > 0 && includedCount < items.length}
        onChange={(event) =>
          setIncluded(
            items.map(({ key }) => key),
            event.target.checked
          )
        }
        aria-label={i18n.CHOICES_SELECT_ALL}
        data-test-subj={`${idPrefix}-select-all`}
      />
    ),
    render: (item: T) => (
      <EuiCheckbox
        id={`${idPrefix}-${item.key}`}
        checked={!excludedKeys.has(item.key)}
        onChange={(event) => setIncluded([item.key], event.target.checked)}
        aria-label={i18n.CHOICES_INCLUDE(getLabel(item))}
      />
    ),
  };
};

const useCommonColumns = (casesById: Map<string, MergePreviewCase>) =>
  useMemo(() => {
    const fromColumn = {
      field: 'sourceCaseId',
      name: i18n.FROM_COLUMN,
      width: '110px',
      truncateText: true,
      render: (caseId: string) => {
        const theCase = casesById.get(caseId);
        return theCase != null ? getCaseReference(theCase) : caseId;
      },
    };
    const addedColumn = {
      field: 'addedAt',
      name: i18n.ADDED_COLUMN,
      width: '150px',
      render: (addedAt: string) => <FormattedRelativePreferenceDate value={addedAt} />,
    };
    return { fromColumn, addedColumn };
  }, [casesById]);

interface ChoiceTableProps<T extends MergeChoice> {
  kind: MergeChoiceKind;
  items: T[];
  columns: Array<EuiBasicTableColumn<T>>;
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  getLabel: (item: T) => string;
  tableCaption: string;
  testSubj: string;
}

const ChoiceTable = <T extends MergeChoice>({
  kind,
  items,
  columns,
  excludedKeys,
  setIncluded,
  getLabel,
  tableCaption,
  testSubj,
}: ChoiceTableProps<T>) => {
  const idPrefix = useGeneratedHtmlId({ prefix: `mergeChoices-${kind}` });
  const allColumns = useMemo(
    () => [buildSelectColumn({ items, excludedKeys, setIncluded, idPrefix, getLabel }), ...columns],
    [columns, excludedKeys, getLabel, idPrefix, items, setIncluded]
  );

  return (
    <EuiInMemoryTable
      compressed
      tableCaption={tableCaption}
      items={items}
      itemId="key"
      columns={allColumns}
      pagination={PAGINATION}
      data-test-subj={testSubj}
    />
  );
};
ChoiceTable.displayName = 'ChoiceTable';

interface KindChoicesProps<T extends MergeChoice> {
  items: T[];
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  casesById: Map<string, MergePreviewCase>;
}

const getAlertLabel = ({ alertId }: AlertChoice) => alertId;
const getAttackLabel = ({ title }: AttackChoice) => title ?? i18n.UNTITLED_ATTACK;
const getEventLabel = ({ eventId }: EventChoice) => eventId;
const getObservableLabel = ({ value }: ObservableChoice) => value;
const getOtherLabel = ({ type }: OtherChoice) => type;

const AlertChoices = React.memo<KindChoicesProps<AlertChoice>>(
  ({ items, excludedKeys, setIncluded, casesById }) => {
    const idPrefix = useGeneratedHtmlId({ prefix: 'mergeChoicesRule' });
    const groups = useMemo(() => groupAlertsByRule(items), [items]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
    const { fromColumn, addedColumn } = useCommonColumns(casesById);

    const toggleExpanded = useCallback(
      (groupId: string) =>
        setExpandedIds((current) => {
          const next = new Set(current);
          if (!next.delete(groupId)) {
            next.add(groupId);
          }
          return next;
        }),
      []
    );

    const alertColumns = useMemo<Array<EuiBasicTableColumn<AlertChoice>>>(
      () => [
        { field: 'alertId', name: i18n.ALERT_ID_COLUMN, truncateText: true },
        { field: 'index', name: i18n.INDEX_COLUMN, truncateText: true },
        fromColumn,
        addedColumn,
      ],
      [addedColumn, fromColumn]
    );

    const groupColumns = useMemo<Array<EuiBasicTableColumn<RuleGroup>>>(
      () => [
        {
          width: '32px',
          render: (group: RuleGroup) => {
            const { id, name, alerts } = group;
            const includedCount = countIncluded(alerts, excludedKeys);
            return (
              <EuiCheckbox
                id={`${idPrefix}-${id}`}
                checked={includedCount === alerts.length}
                indeterminate={includedCount > 0 && includedCount < alerts.length}
                onChange={(event) =>
                  setIncluded(
                    alerts.map(({ key }) => key),
                    event.target.checked
                  )
                }
                aria-label={i18n.CHOICES_INCLUDE_RULE(name)}
                data-test-subj={`merge-choices-rule-${id}-checkbox`}
              />
            );
          },
        },
        { field: 'name', name: i18n.RULE_COLUMN, truncateText: true },
        {
          name: i18n.ALERTS_COLUMN,
          width: '130px',
          render: (group: RuleGroup) => {
            const { id, alerts } = group;
            return (
              <span data-test-subj={`merge-choices-rule-${id}-count`}>
                {i18n.CHOICES_SELECTED(countIncluded(alerts, excludedKeys), alerts.length)}
              </span>
            );
          },
        },
        {
          name: i18n.FROM_COLUMN,
          width: '130px',
          truncateText: true,
          render: (group: RuleGroup) =>
            [...new Set(group.alerts.map(({ sourceCaseId }) => sourceCaseId))]
              .map((caseId) => {
                const theCase = casesById.get(caseId);
                return theCase != null ? getCaseReference(theCase) : caseId;
              })
              .join(', '),
        },
        {
          width: '40px',
          isExpander: true,
          render: (group: RuleGroup) => {
            const { id, name } = group;
            const isExpanded = expandedIds.has(id);
            const label = isExpanded
              ? i18n.CHOICES_HIDE_RULE_ALERTS(name)
              : i18n.CHOICES_SHOW_RULE_ALERTS(name);
            return (
              <EuiToolTip content={label} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                  color="text"
                  aria-expanded={isExpanded}
                  aria-label={label}
                  onClick={() => toggleExpanded(id)}
                  data-test-subj={`merge-choices-rule-${id}-expand`}
                />
              </EuiToolTip>
            );
          },
        },
      ],
      [casesById, excludedKeys, expandedIds, idPrefix, setIncluded, toggleExpanded]
    );

    const itemIdToExpandedRowMap = useMemo(
      () =>
        Object.fromEntries(
          groups
            .filter(({ id }) => expandedIds.has(id))
            .map(({ id, name, alerts }) => [
              id,
              <ChoiceTable
                kind="alerts"
                items={alerts}
                columns={alertColumns}
                excludedKeys={excludedKeys}
                setIncluded={setIncluded}
                getLabel={getAlertLabel}
                tableCaption={name}
                testSubj={`merge-choices-rule-${id}-alerts`}
              />,
            ])
        ),
      [alertColumns, excludedKeys, expandedIds, groups, setIncluded]
    );

    return (
      <EuiInMemoryTable
        tableCaption={i18n.CHOICES_ALERTS_BY_RULE}
        items={groups}
        itemId="id"
        columns={groupColumns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        pagination={PAGINATION}
        data-test-subj="merge-choices-rules"
      />
    );
  }
);
AlertChoices.displayName = 'AlertChoices';

const AttackChoices = React.memo<KindChoicesProps<AttackChoice>>(({ casesById, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(casesById);
  const columns = useMemo<Array<EuiBasicTableColumn<AttackChoice>>>(
    () => [
      {
        name: i18n.ATTACK_COLUMN,
        truncateText: true,
        render: (attack: AttackChoice) => getAttackLabel(attack),
      },
      {
        name: i18n.ALERTS_COLUMN,
        width: '100px',
        render: ({ alertKeys }: AttackChoice) => i18n.ATTACK_ALERTS(alertKeys.length),
      },
      fromColumn,
      addedColumn,
    ],
    [addedColumn, fromColumn]
  );
  return (
    <>
      <EuiText size="xs" color="subdued">
        {i18n.ATTACKS_HELP}
      </EuiText>
      <EuiSpacer size="s" />
      <ChoiceTable
        {...props}
        kind="attacks"
        columns={columns}
        getLabel={getAttackLabel}
        tableCaption={i18n.ATTACKS}
        testSubj="merge-choices-attacks"
      />
    </>
  );
});
AttackChoices.displayName = 'AttackChoices';

const EventChoices = React.memo<KindChoicesProps<EventChoice>>(({ casesById, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(casesById);
  const columns = useMemo<Array<EuiBasicTableColumn<EventChoice>>>(
    () => [
      { field: 'eventId', name: i18n.EVENT_ID_COLUMN, truncateText: true },
      { field: 'index', name: i18n.INDEX_COLUMN, truncateText: true },
      fromColumn,
      addedColumn,
    ],
    [addedColumn, fromColumn]
  );
  return (
    <ChoiceTable
      {...props}
      kind="events"
      columns={columns}
      getLabel={getEventLabel}
      tableCaption={i18n.EVENTS}
      testSubj="merge-choices-events"
    />
  );
});
EventChoices.displayName = 'EventChoices';

const ObservableChoices = React.memo<KindChoicesProps<ObservableChoice>>(
  ({ casesById, ...props }) => {
    const { fromColumn } = useCommonColumns(casesById);
    const columns = useMemo<Array<EuiBasicTableColumn<ObservableChoice>>>(
      () => [
        {
          field: 'typeKey',
          name: i18n.TYPE_COLUMN,
          width: '160px',
          render: (typeKey: string) => OBSERVABLE_TYPE_LABELS.get(typeKey) ?? typeKey,
        },
        { field: 'value', name: i18n.VALUE_COLUMN, truncateText: true },
        fromColumn,
      ],
      [fromColumn]
    );
    return (
      <ChoiceTable
        {...props}
        kind="observables"
        columns={columns}
        getLabel={getObservableLabel}
        tableCaption={i18n.OBSERVABLES}
        testSubj="merge-choices-observables"
      />
    );
  }
);
ObservableChoices.displayName = 'ObservableChoices';

const OtherChoices = React.memo<KindChoicesProps<OtherChoice>>(({ casesById, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(casesById);
  const columns = useMemo<Array<EuiBasicTableColumn<OtherChoice>>>(
    () => [
      {
        name: i18n.TYPE_COLUMN,
        render: ({ type, countsTowardLimit }: OtherChoice) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>{type}</EuiFlexItem>
            {countsTowardLimit ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.COUNTS_TOWARD_LIMIT}</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      fromColumn,
      addedColumn,
    ],
    [addedColumn, fromColumn]
  );
  return (
    <ChoiceTable
      {...props}
      kind="other"
      columns={columns}
      getLabel={getOtherLabel}
      tableCaption={i18n.OTHER_ATTACHMENTS}
      testSubj="merge-choices-other"
    />
  );
});
OtherChoices.displayName = 'OtherChoices';

interface MergeAttachmentsModalProps {
  choices: MergeAttachmentChoices;
  /** The preview counts before any exclusions. */
  attachments: MergeCasesPreviewResponse['attachments'];
  casesById: Map<string, MergePreviewCase>;
  excludedKeys: ReadonlySet<string>;
  /** The kind to show first, e.g. the one whose row the user opened the modal from. */
  initialKind?: MergeChoiceKind;
  onApply: (excludedKeys: ReadonlySet<string>) => void;
  onClose: () => void;
}

/** Lets the user leave attachments out of an over-limit merge; they stay on their source cases. */
export const MergeAttachmentsModal = React.memo<MergeAttachmentsModalProps>(
  ({ choices, attachments, casesById, excludedKeys, initialKind, onApply, onClose }) => {
    const { euiTheme } = useEuiTheme();
    const titleId = useGeneratedHtmlId({ prefix: 'mergeAttachmentsModalTitle' });
    const [draft, setDraft] = useState<ReadonlySet<string>>(excludedKeys);

    const kinds = useMemo(
      () => MERGE_CHOICE_KINDS.filter((kind) => choices[kind].length > 0),
      [choices]
    );
    const [selectedKind, setSelectedKind] = useState<MergeChoiceKind | undefined>(
      () =>
        (initialKind != null && kinds.includes(initialKind) ? initialKind : undefined) ??
        kinds.find((kind) => attachments[kind].overBy > 0) ??
        kinds[0]
    );

    const selected = useMemo(
      () => applyExclusions({ attachments, choices }, draft),
      [attachments, choices, draft]
    );
    const leftOutCount = MERGE_CHOICE_KINDS.filter((kind) => kind !== 'attacks').reduce(
      (count, kind) => count + selected[kind].excluded,
      0
    );

    const setIncluded = useCallback<SetIncluded>(
      (keys, isIncluded) =>
        setDraft((current) => {
          const next = new Set(current);
          for (const key of keys) {
            if (isIncluded) {
              next.delete(key);
            } else {
              next.add(key);
            }
          }
          return next;
        }),
      []
    );

    const alertsRoom = getRoomForAlerts(attachments.alerts, choices, draft);
    const keepNewestAlerts = useCallback(() => {
      if (alertsRoom == null) {
        return;
      }
      const alertKeys = new Set(choices.alerts.map(({ key }) => key));
      setDraft(
        (current) =>
          new Set([
            ...[...current].filter((key) => !alertKeys.has(key)),
            ...getKeysOutsideNewest(choices.alerts, alertsRoom),
          ])
      );
    }, [alertsRoom, choices.alerts]);

    const renderKindStatus = (kind: MergeChoiceKind) => {
      const total = choices[kind].length;
      const room =
        kind === 'alerts' ? alertsRoom : getRoomForKind(attachments[kind], choices, kind);
      const { overBy } = selected[kind];
      const excluded = choices[kind].filter(({ key }) => draft.has(key)).length;

      return (
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj={`merge-choices-${kind}-selected`}>
              {i18n.CHOICES_SELECTED(total - excluded, total)}
            </EuiText>
          </EuiFlexItem>
          {room != null ? (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color={overBy > 0 ? 'warning' : 'success'}
                data-test-subj={`merge-choices-${kind}-status`}
              >
                {overBy > 0 ? i18n.CHOICES_LEAVE_OUT_MORE(overBy) : i18n.CHOICES_WITHIN_LIMIT}
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {kind === 'alerts' && room != null ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.KEEP_NEWEST_HELP}>
                <EuiButton
                  size="s"
                  iconType="sortDown"
                  onClick={keepNewestAlerts}
                  data-test-subj="merge-choices-keep-newest"
                >
                  {i18n.KEEP_NEWEST(room)}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      );
    };

    const renderKindChoices = (kind: MergeChoiceKind) => {
      const props = { excludedKeys: draft, setIncluded, casesById };
      switch (kind) {
        case 'alerts':
          return <AlertChoices {...props} items={choices.alerts} />;
        case 'attacks':
          return <AttackChoices {...props} items={choices.attacks} />;
        case 'events':
          return <EventChoices {...props} items={choices.events} />;
        case 'observables':
          return <ObservableChoices {...props} items={choices.observables} />;
        case 'other':
          return <OtherChoices {...props} items={choices.other} />;
      }
    };

    return (
      <EuiModal
        onClose={onClose}
        aria-labelledby={titleId}
        css={css`
          width: ${euiTheme.breakpoint.m}px;
        `}
        data-test-subj="merge-attachments-modal"
      >
        <EuiModalHeader>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiModalHeaderTitle id={titleId}>{i18n.CHOOSE_ATTACHMENTS_TITLE}</EuiModalHeaderTitle>
            <EuiText size="s" color="subdued">
              {i18n.CHOOSE_ATTACHMENTS_DESCRIPTION}
            </EuiText>
          </EuiFlexGroup>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiTabs size="s">
            {kinds.map((kind) => (
              <EuiTab
                key={kind}
                isSelected={kind === selectedKind}
                onClick={() => setSelectedKind(kind)}
                append={
                  <EuiBadge color={selected[kind].overBy > 0 ? 'warning' : 'hollow'}>
                    {choices[kind].filter(({ key }) => !draft.has(key)).length}
                  </EuiBadge>
                }
                data-test-subj={`merge-choices-tab-${kind}`}
              >
                {KIND_TITLES[kind]}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="m" />
          {selectedKind != null ? (
            <>
              {renderKindStatus(selectedKind)}
              <EuiSpacer size="m" />
              {renderKindChoices(selectedKind)}
            </>
          ) : null}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="merge-choices-left-out">
                {i18n.CHOICES_LEFT_OUT_TOTAL(leftOutCount)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose} data-test-subj="merge-choices-cancel">
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={() => onApply(draft)}
                    data-test-subj="merge-choices-apply"
                  >
                    {i18n.APPLY}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
MergeAttachmentsModal.displayName = 'MergeAttachmentsModal';
