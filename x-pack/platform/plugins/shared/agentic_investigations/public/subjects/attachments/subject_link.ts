/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALERTING_V2_EPISODES_LOCATOR,
  ALERTING_V2_EPISODES_STATUS_ALL,
} from '@kbn/alerting-v2-constants';
import { ALERTS_LOCATOR_ID, createObservabilityAlertingV2Host } from '@kbn/deeplinks-observability';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { isUniversalAlertSnapshot } from '../../../common/subjects/subject';
import type { SubjectRowData } from './subject_title';
import type { SubjectServices } from './subject_services';

interface SubjectLocatorTarget {
  locatorId: string;
  params: SerializableRecord;
}

/** Where alerting v2 episode details live: the alerts page of the Observability Alerting app. */
const OBSERVABILITY_ALERTING_EPISODES_HOST = createObservabilityAlertingV2Host(
  (app, { alerts }) => ({ app, pathPrefix: alerts })
);

/** The subject fields a locator target is built from. */
export type SubjectLocatorInput = Pick<SubjectRowData, 'type' | 'id'> & {
  /** `snapshot.source` of an alert subject: set only on an alerting v2 alert. */
  source?: string;
};

/**
 * The page a subject opens, as a locator and its params, from the subject's type and id: an
 * alert's details page (a classic alert by its `kibana.alert.uuid`, an alerting v2 alert by its
 * episode id).
 */
export const getSubjectLocatorTarget = ({
  type,
  id,
  source,
}: SubjectLocatorInput): SubjectLocatorTarget | undefined => {
  if (type === 'alert' && isUniversalAlertSnapshot({ source })) {
    return {
      locatorId: ALERTING_V2_EPISODES_LOCATOR,
      params: { episodeId: id, host: OBSERVABILITY_ALERTING_EPISODES_HOST },
    };
  }
  if (type === 'alert') {
    return { locatorId: ALERTS_LOCATOR_ID, params: { alertId: id } };
  }
  return undefined;
};

/**
 * Links come from a rule type: a Kibana path or an absolute URL. Anything else (for example a
 * `javascript:` URL) is not rendered as a link.
 */
const isSafeHref = (url: string): boolean =>
  (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url);

/** Slack permalinks are validated as HTTPS on write; checked again because the row is a raw link. */
const isSafeSlackHref = (url: string): boolean => /^https:\/\//i.test(url);

/**
 * The link the subject carries itself: the alert's `kibana.alert.url` (used when the alerts
 * locator is not available) or the Slack thread.
 */
export const getOwnSubjectHref = ({
  type,
  snapshot,
  slack,
}: SubjectRowData): string | undefined => {
  if (type === 'alert') {
    return snapshot?.url && isSafeHref(snapshot.url) ? snapshot.url : undefined;
  }
  if (type === 'slack_thread') {
    return slack?.permalink && isSafeSlackHref(slack.permalink) ? slack.permalink : undefined;
  }
  return undefined;
};

/**
 * The alerts an investigation is about, as one page: the alerts list filtered to exactly those
 * alerts (classic and alerting v2 alike), over every status and a range that starts before the
 * earliest of them.
 */
export const getAlertsListLocatorTarget = (
  alerts: readonly SubjectRowData[]
): SubjectLocatorTarget | undefined =>
  buildAlertsListLocatorTarget(getAlertIds(alerts), getAlertsListFrom(alerts));

const getAlertIds = (alerts: readonly SubjectRowData[]): string[] =>
  alerts.filter(({ type }) => type === 'alert').map(({ id }) => id);

const buildAlertsListLocatorTarget = (
  alertIds: string[],
  from: string
): SubjectLocatorTarget | undefined => {
  if (alertIds.length === 0) {
    return undefined;
  }
  return {
    locatorId: ALERTING_V2_EPISODES_LOCATOR,
    params: {
      host: OBSERVABILITY_ALERTING_EPISODES_HOST,
      filters: {
        queryString: getAlertsListQueryString(alertIds),
        status: ALERTING_V2_EPISODES_STATUS_ALL,
      },
      timeRange: { from, to: 'now' },
    },
  };
};

/**
 * The list's search query for a set of alerts. The two sources behind the list read a query in
 * their own vocabulary — `alert.id` for alerting v2 episodes, `kibana.alert.uuid` for classic
 * alerts — and each ignores the half it does not know, so both halves are asked for.
 */
const getAlertsListQueryString = (alertIds: string[]): string => {
  const values = alertIds.map(escapeKqlValue).join(' or ');
  return `alert.id: (${values}) or kibana.alert.uuid: (${values})`;
};

const escapeKqlValue = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** The list's time range must cover the alerts, which can be older than the page's default. */
const ALERTS_LIST_FALLBACK_FROM = 'now-30d';

/** A minute before the earliest alert start, so a rounded timestamp still includes it. */
const ALERTS_LIST_FROM_MARGIN_MS = 60_000;

const getAlertsListFrom = (alerts: readonly SubjectRowData[]): string => {
  const starts = alerts
    .map(({ snapshot }) => (snapshot?.start ? new Date(snapshot.start).getTime() : NaN))
    .filter((time) => !Number.isNaN(time));
  if (starts.length === 0) {
    return ALERTS_LIST_FALLBACK_FROM;
  }
  return new Date(Math.min(...starts) - ALERTS_LIST_FROM_MARGIN_MS).toISOString();
};

/** A click that the browser handles itself: middle button, or a new tab/window modifier. */
export const isModifiedClick = (event: React.MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

export interface SubjectLink {
  href?: string;
  /** Opens a located page inside Kibana, without reloading; modified clicks keep the default. */
  onClick?: (event: React.MouseEvent) => void;
  /** Slack threads open in a new tab. */
  isExternal: boolean;
}

/**
 * Where a click on a subject goes: the page its locator resolves to, else the link it carries.
 * Subjects without either (a significant event, a question, a Slack thread without a permalink)
 * do not link.
 */
export const useSubjectLink = (subject: SubjectRowData | undefined): SubjectLink => {
  const subjectType = subject?.type;
  const subjectId = subject?.id;
  const source = subject?.snapshot?.source;
  // Keyed on the type, id and source, so a re-render with an equal subject keeps the located URL.
  const target = useMemo(
    () =>
      subjectType && subjectId
        ? getSubjectLocatorTarget({ type: subjectType, id: subjectId, source })
        : undefined,
    [subjectType, subjectId, source]
  );
  const { href: locatedHref, onClick: onLocatorClick } = useLocatorLink(target);

  if (!subject) {
    return { isExternal: false };
  }
  if (locatedHref !== undefined) {
    return { href: locatedHref, onClick: onLocatorClick, isExternal: false };
  }
  const ownHref = getOwnSubjectHref(subject);
  return { href: ownHref, isExternal: ownHref !== undefined && subject.type === 'slack_thread' };
};

/**
 * Where the "N alerts" row goes: the alerts list, filtered to those alerts. Without the locator
 * (alerting v2 not available) there is no link and the row lists the alerts inline instead.
 */
export const useAlertsListLink = (alerts: readonly SubjectRowData[]): SubjectLink => {
  // Keyed on the ids and the range, so a re-render with an equal list keeps the located URL,
  // whether or not the caller passes the same array.
  const alertIdsKey = getAlertIds(alerts).join(ALERT_IDS_KEY_SEPARATOR);
  const from = getAlertsListFrom(alerts);
  const target = useMemo(
    () =>
      buildAlertsListLocatorTarget(
        alertIdsKey ? alertIdsKey.split(ALERT_IDS_KEY_SEPARATOR) : [],
        from
      ),
    [alertIdsKey, from]
  );
  const { href, onClick } = useLocatorLink(target);
  return { href, onClick, isExternal: false };
};

/** Alert ids are uuids, so a comma never appears in one. */
const ALERT_IDS_KEY_SEPARATOR = ',';

/** Resolves a locator target to a URL, and to a click that navigates to it inside Kibana. */
const useLocatorLink = (
  target: SubjectLocatorTarget | undefined
): { href?: string; onClick: (event: React.MouseEvent) => void } => {
  const { share } = useKibana<SubjectServices>().services;
  // Memoized so the effect below does not re-run, and loop, when a lookup returns a new object.
  const locator = useMemo(
    () => (target ? share?.url.locators.get<SerializableRecord>(target.locatorId) : undefined),
    [share, target]
  );
  const stableParams = target?.params;
  const [locatedHref, setLocatedHref] = useState<string | undefined>();

  useEffect(() => {
    setLocatedHref(undefined);
    if (!locator || !stableParams) {
      return;
    }
    let isCurrent = true;
    locator
      .getUrl(stableParams)
      .then((url) => {
        if (isCurrent) {
          setLocatedHref(url);
        }
      })
      .catch(() => {
        // Without a URL the caller falls back to whatever link it has.
      });
    return () => {
      isCurrent = false;
    };
  }, [locator, stableParams]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!locator || !stableParams || isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      void locator.navigate(stableParams);
    },
    [locator, stableParams]
  );

  return { href: locatedHref, onClick };
};
