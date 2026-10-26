/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALERTING_V2_EPISODES_LOCATOR } from '@kbn/alerting-v2-constants';
import { ALERTS_LOCATOR_ID, createObservabilityAlertingV2Host } from '@kbn/deeplinks-observability';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
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
  /** `snapshot.alert_version` of an alert subject; `v2` is an alerting v2 episode. */
  alertVersion?: string;
};

/**
 * The page a subject opens, as a locator and its params, from the subject's type and id: an
 * alert's details page (a classic alert by its `kibana.alert.uuid`, an alerting v2 alert by its
 * episode id).
 */
export const getSubjectLocatorTarget = ({
  type,
  id,
  alertVersion,
}: SubjectLocatorInput): SubjectLocatorTarget | undefined => {
  if (type === 'alert' && alertVersion === 'v2') {
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
  const { share } = useKibana<SubjectServices>().services;
  const subjectType = subject?.type;
  const subjectId = subject?.id;
  const alertVersion = subject?.snapshot?.alert_version;
  // Keyed on the type, id and alert version, so a re-render with an equal subject keeps the
  // located URL.
  const target = useMemo(
    () =>
      subjectType && subjectId
        ? getSubjectLocatorTarget({ type: subjectType, id: subjectId, alertVersion })
        : undefined,
    [subjectType, subjectId, alertVersion]
  );
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
        // Without a URL the row falls back to the subject's own link.
      });
    return () => {
      isCurrent = false;
    };
  }, [locator, stableParams]);

  const onLocatorClick = useCallback(
    (event: React.MouseEvent) => {
      if (!locator || !stableParams || isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      void locator.navigate(stableParams);
    },
    [locator, stableParams]
  );

  if (!subject) {
    return { isExternal: false };
  }
  if (locatedHref !== undefined) {
    return { href: locatedHref, onClick: onLocatorClick, isExternal: false };
  }
  const ownHref = getOwnSubjectHref(subject);
  return { href: ownHref, isExternal: ownHref !== undefined && subject.type === 'slack_thread' };
};
