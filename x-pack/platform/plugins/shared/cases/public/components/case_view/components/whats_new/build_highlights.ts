/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { CaseDeltaItem } from '../../../../../common/types/api';
import type { CaseSeverity, CaseStatuses } from '../../../../../common/types/domain';
import { severities } from '../../../severity/config';
import { statuses } from '../../../status/config';
import * as i18n from './translations';

export interface Highlight {
  readonly key: string;
  readonly icon: IconType;
  readonly text: string;
}

const MAX_LISTED = 3;

const unique = (values: ReadonlyArray<string | null>): string[] => [
  ...new Set(values.filter((value): value is string => value != null)),
];

const joinList = (values: readonly string[]): string =>
  values.length > MAX_LISTED
    ? i18n.AND_MORE(values.slice(0, MAX_LISTED).join(', '), values.length - MAX_LISTED)
    : values.join(', ');

const isCaseStatus = (value: string | null): value is CaseStatuses =>
  value != null && value in statuses;

const isCaseSeverity = (value: string | null): value is CaseSeverity =>
  value != null && value in severities;

const isUserComment = ({ category, action }: CaseDeltaItem) =>
  category === 'comments' && action === 'create';

const alertsHighlight = (items: readonly CaseDeltaItem[]): Highlight[] => {
  const alerts = items.filter(({ category }) => category === 'alerts');
  return alerts.length === 0
    ? []
    : [
        {
          key: 'alerts',
          icon: 'bell',
          text: i18n.ALERTS_ADDED(alerts.length, joinList(unique(alerts.map((a) => a.detail)))),
        },
      ];
};

/** Items are newest first, so the first match is the current value. */
const changeHighlights = (items: readonly CaseDeltaItem[]): Highlight[] => {
  const changes = items.filter(({ category }) => category === 'changes');
  const status = changes.find(({ type, detail }) => type === 'status' && isCaseStatus(detail));
  const severity = changes.find(
    ({ type, detail }) => type === 'severity' && isCaseSeverity(detail)
  );
  const others = changes.filter(({ type }) => type !== 'status' && type !== 'severity');

  return [
    ...(isCaseStatus(status?.detail ?? null)
      ? [
          {
            key: 'status',
            icon: 'merge',
            text: i18n.STATUS_SET(
              statuses[status?.detail as CaseStatuses].label,
              status?.author ?? ''
            ),
          },
        ]
      : []),
    ...(isCaseSeverity(severity?.detail ?? null)
      ? [
          {
            key: 'severity',
            icon: 'merge',
            text: i18n.SEVERITY_SET(
              severities[severity?.detail as CaseSeverity].label,
              severity?.author ?? ''
            ),
          },
        ]
      : []),
    ...(others.length > 0
      ? [{ key: 'other', icon: 'merge', text: i18n.OTHER_CHANGES(others.length) }]
      : []),
  ];
};

const commentHighlights = (items: readonly CaseDeltaItem[]): Highlight[] => {
  const comments = items.filter(isUserComment);
  return comments.length === 0
    ? []
    : [
        {
          key: 'comments',
          icon: 'editorComment',
          text: i18n.COMMENTS_FROM(
            comments.length,
            joinList(unique(comments.map((c) => c.author)))
          ),
        },
      ];
};

const evidenceHighlights = (items: readonly CaseDeltaItem[]): Highlight[] => {
  const evidence = items.filter(({ category }) => category === 'evidence');
  const files = unique(evidence.filter(({ type }) => type === 'comment').map((e) => e.detail));
  const observables = evidence.filter(({ type }) => type === 'observables');
  const observableActionTypes = unique(observables.map(({ detail }) => detail));

  return [
    ...(files.length > 0
      ? [{ key: 'files', icon: 'paperClip', text: i18n.FILES_ADDED(joinList(files)) }]
      : []),
    ...observableActionTypes.map((actionType) => ({
      key: `observables-${actionType}`,
      icon: 'paperClip',
      text: i18n.OBSERVABLES_CHANGED(
        observables
          .filter(({ detail }) => detail === actionType)
          .reduce((total, { count }) => total + count, 0),
        actionType
      ),
    })),
  ];
};

export const buildHighlights = (items: readonly CaseDeltaItem[]): Highlight[] => [
  ...alertsHighlight(items),
  ...changeHighlights(items),
  ...commentHighlights(items),
  ...evidenceHighlights(items),
];
