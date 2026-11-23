/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../../common/constants';
import type { MergeAttachmentChoices, MergePreviewCase } from '../../../../common/types/api';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { CaseRef, CaseRefs } from '../value_cards/case_refs';
import type { MergeChoice, MergeChoiceKind } from '../utils';
import * as i18n from '../translations';

export type AlertChoice = MergeAttachmentChoices['alerts'][number];
export type AttackChoice = MergeAttachmentChoices['attacks'][number];
type EventChoice = MergeAttachmentChoices['events'][number];
type ObservableChoice = MergeAttachmentChoices['observables'][number];
type OtherChoice = MergeAttachmentChoices['other'][number];

/** Includes or leaves out the items with these keys. */
export type SetIncluded = (keys: string[], isIncluded: boolean) => void;

const PAGINATION = { pageSizeOptions: [10, 25, 50], initialPageSize: 10 };

const OBSERVABLE_TYPE_LABELS = new Map(
  OBSERVABLE_TYPES_BUILTIN.map(({ key, label }) => [key, label])
);

export interface RuleGroup {
  id: string;
  name: string;
  alerts: AlertChoice[];
}

/** Groups alerts by the rule that raised them, biggest group first. */
export const groupAlertsByRule = (alerts: AlertChoice[]): RuleGroup[] => {
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

export interface CaseGroup {
  caseId: string;
  alerts: AlertChoice[];
}

/** Groups alerts by the source case they come from, in the order of the cases. */
export const groupAlertsByCase = (alerts: AlertChoice[], cases: MergePreviewCase[]): CaseGroup[] =>
  cases.flatMap(({ id }) => {
    const caseAlerts = alerts.filter(({ sourceCaseId }) => sourceCaseId === id);
    return caseAlerts.length > 0 ? [{ caseId: id, alerts: caseAlerts }] : [];
  });

export const countIncluded = (items: MergeChoice[], excludedKeys: ReadonlySet<string>): number =>
  items.filter(({ key }) => !excludedKeys.has(key)).length;

interface SelectColumnArgs<T extends MergeChoice> {
  items: T[];
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  idPrefix: string;
  getLabel: (item: T) => string;
  isDisabled: boolean;
}

/** EUI's built-in selection only covers the current page; this one covers the whole list. */
const buildSelectColumn = <T extends MergeChoice>({
  items,
  excludedKeys,
  setIncluded,
  idPrefix,
  getLabel,
  isDisabled,
}: SelectColumnArgs<T>): EuiBasicTableColumn<T> => {
  const includedCount = countIncluded(items, excludedKeys);
  return {
    width: '32px',
    name: (
      <EuiCheckbox
        id={`${idPrefix}-all`}
        checked={includedCount === items.length}
        indeterminate={includedCount > 0 && includedCount < items.length}
        disabled={isDisabled}
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
        disabled={isDisabled}
        onChange={(event) => setIncluded([item.key], event.target.checked)}
        aria-label={i18n.CHOICES_INCLUDE(getLabel(item))}
      />
    ),
  };
};

const useCommonColumns = (cases: MergePreviewCase[]) =>
  useMemo(() => {
    const fromColumn = {
      field: 'sourceCaseId',
      name: i18n.FROM_COLUMN,
      width: '110px',
      render: (caseId: string) => <CaseRef caseId={caseId} cases={cases} />,
    };
    const addedColumn = {
      field: 'addedAt',
      name: i18n.ADDED_COLUMN,
      width: '150px',
      render: (addedAt: string) => <FormattedRelativePreferenceDate value={addedAt} />,
    };
    return { fromColumn, addedColumn };
  }, [cases]);

interface ChoiceTableProps<T extends MergeChoice> {
  kind: MergeChoiceKind;
  items: T[];
  columns: Array<EuiBasicTableColumn<T>>;
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  getLabel: (item: T) => string;
  tableCaption: string;
  testSubj: string;
  isDisabled: boolean;
}

export const ChoiceTable = <T extends MergeChoice>({
  kind,
  items,
  columns,
  excludedKeys,
  setIncluded,
  getLabel,
  tableCaption,
  testSubj,
  isDisabled,
}: ChoiceTableProps<T>) => {
  const idPrefix = useGeneratedHtmlId({ prefix: `mergeChoices-${kind}` });
  const allColumns = useMemo(
    () => [
      buildSelectColumn({ items, excludedKeys, setIncluded, idPrefix, getLabel, isDisabled }),
      ...columns,
    ],
    [columns, excludedKeys, getLabel, idPrefix, isDisabled, items, setIncluded]
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

export interface KindChoicesProps<T extends MergeChoice> {
  items: T[];
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  cases: MergePreviewCase[];
  isDisabled: boolean;
}

const getAlertLabel = ({ alertId }: AlertChoice) => alertId;
const getAttackLabel = ({ title }: AttackChoice) => title ?? i18n.UNTITLED_ATTACK;
const getEventLabel = ({ eventId }: EventChoice) => eventId;
const getObservableLabel = ({ value }: ObservableChoice) => value;
const getOtherLabel = ({ type }: OtherChoice) => type;

const GroupCheckbox = React.memo<{
  id: string;
  alerts: AlertChoice[];
  excludedKeys: ReadonlySet<string>;
  setIncluded: SetIncluded;
  label: string;
  isDisabled: boolean;
  testSubj: string;
}>(({ id, alerts, excludedKeys, setIncluded, label, isDisabled, testSubj }) => {
  const includedCount = countIncluded(alerts, excludedKeys);
  return (
    <EuiCheckbox
      id={id}
      checked={includedCount === alerts.length}
      indeterminate={includedCount > 0 && includedCount < alerts.length}
      disabled={isDisabled}
      onChange={(event) =>
        setIncluded(
          alerts.map(({ key }) => key),
          event.target.checked
        )
      }
      aria-label={label}
      data-test-subj={testSubj}
    />
  );
});
GroupCheckbox.displayName = 'GroupCheckbox';

/** Alerts grouped by rule; each rule opens its alerts so single ones can be left out. */
export const AlertChoicesByRule = React.memo<KindChoicesProps<AlertChoice>>(
  ({ items, excludedKeys, setIncluded, cases, isDisabled }) => {
    const idPrefix = useGeneratedHtmlId({ prefix: 'mergeChoicesRule' });
    const groups = useMemo(() => groupAlertsByRule(items), [items]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
    const { fromColumn, addedColumn } = useCommonColumns(cases);

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
          render: (group: RuleGroup) => (
            <GroupCheckbox
              id={`${idPrefix}-${group.id}`}
              alerts={group.alerts}
              excludedKeys={excludedKeys}
              setIncluded={setIncluded}
              label={i18n.CHOICES_INCLUDE_RULE(group.name)}
              isDisabled={isDisabled}
              testSubj={`merge-choices-rule-${group.id}-checkbox`}
            />
          ),
        },
        { field: 'name', name: i18n.RULE_COLUMN, truncateText: true },
        {
          name: i18n.FROM_COLUMN,
          width: '150px',
          render: (group: RuleGroup) => (
            <CaseRefs
              caseIds={[...new Set(group.alerts.map(({ sourceCaseId }) => sourceCaseId))]}
              cases={cases}
            />
          ),
        },
        {
          name: i18n.ALERTS_COLUMN,
          width: '130px',
          align: 'right',
          render: (group: RuleGroup) => (
            <span data-test-subj={`merge-choices-rule-${group.id}-count`}>
              {i18n.CHOICES_SELECTED(
                countIncluded(group.alerts, excludedKeys),
                group.alerts.length
              )}
            </span>
          ),
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
      [cases, excludedKeys, expandedIds, idPrefix, isDisabled, setIncluded, toggleExpanded]
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
                isDisabled={isDisabled}
              />,
            ])
        ),
      [alertColumns, excludedKeys, expandedIds, groups, isDisabled, setIncluded]
    );

    return (
      <EuiInMemoryTable
        compressed
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
AlertChoicesByRule.displayName = 'AlertChoicesByRule';

/** Alerts grouped by the case they come from, so a whole case's alerts can be left out. */
export const AlertChoicesByCase = React.memo<KindChoicesProps<AlertChoice>>(
  ({ items, excludedKeys, setIncluded, cases, isDisabled }) => {
    const idPrefix = useGeneratedHtmlId({ prefix: 'mergeChoicesCase' });
    const groups = useMemo(() => groupAlertsByCase(items, cases), [cases, items]);
    const casesById = useMemo(
      () => new Map(cases.map((theCase) => [theCase.id, theCase])),
      [cases]
    );

    const columns = useMemo<Array<EuiBasicTableColumn<CaseGroup>>>(
      () => [
        {
          width: '32px',
          render: (group: CaseGroup) => (
            <GroupCheckbox
              id={`${idPrefix}-${group.caseId}`}
              alerts={group.alerts}
              excludedKeys={excludedKeys}
              setIncluded={setIncluded}
              label={i18n.COPY_CASE_ALERTS(casesById.get(group.caseId)?.title ?? group.caseId)}
              isDisabled={isDisabled}
              testSubj={`merge-choices-case-${group.caseId}-checkbox`}
            />
          ),
        },
        {
          name: i18n.CASE_COLUMN,
          width: '80px',
          render: (group: CaseGroup) => <CaseRef caseId={group.caseId} cases={cases} />,
        },
        {
          name: i18n.TITLE_FIELD,
          truncateText: true,
          render: (group: CaseGroup) => casesById.get(group.caseId)?.title ?? '',
        },
        {
          name: i18n.ALERTS_COLUMN,
          width: '130px',
          align: 'right',
          render: (group: CaseGroup) => (
            <span data-test-subj={`merge-choices-case-${group.caseId}-count`}>
              {i18n.CHOICES_SELECTED(
                countIncluded(group.alerts, excludedKeys),
                group.alerts.length
              )}
            </span>
          ),
        },
      ],
      [cases, casesById, excludedKeys, idPrefix, isDisabled, setIncluded]
    );

    return (
      <EuiInMemoryTable
        compressed
        tableCaption={i18n.ALERTS_BY_CASE}
        items={groups}
        itemId="caseId"
        columns={columns}
        data-test-subj="merge-choices-cases"
      />
    );
  }
);
AlertChoicesByCase.displayName = 'AlertChoicesByCase';

export const AttackChoices = React.memo<KindChoicesProps<AttackChoice>>(({ cases, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(cases);
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
        render: ({ alertKeys }: AttackChoice) => i18n.ALERT_COUNT(alertKeys.length),
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

export const EventChoices = React.memo<KindChoicesProps<EventChoice>>(({ cases, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(cases);
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

export const ObservableChoices = React.memo<KindChoicesProps<ObservableChoice>>(
  ({ cases, ...props }) => {
    const { fromColumn } = useCommonColumns(cases);
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

export const OtherChoices = React.memo<KindChoicesProps<OtherChoice>>(({ cases, ...props }) => {
  const { fromColumn, addedColumn } = useCommonColumns(cases);
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
