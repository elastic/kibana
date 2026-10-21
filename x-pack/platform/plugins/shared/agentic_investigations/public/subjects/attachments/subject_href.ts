/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { SubjectRowData } from './subject_title';

/**
 * Returns where a click on a subject goes, or `undefined` when the resolver does not know the
 * subject. Supplied by the solution that owns the subject's page (for example the significant
 * event or the alert details page).
 */
export type SubjectHrefResolver = (subject: SubjectRowData) => string | undefined;

/** The resolver the subject rows read; rendered by each entry point that shows subjects. */
export const SubjectHrefResolverContext = createContext<SubjectHrefResolver | undefined>(undefined);

/**
 * Links come from a rule type or a solution: a Kibana path or an absolute URL. Anything else (for
 * example a `javascript:` URL) is not rendered as a link.
 */
const isSafeHref = (url: string): boolean =>
  (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url);

/** Slack permalinks are validated as HTTPS on write; checked again because the row is a raw link. */
const isSafeSlackHref = (url: string): boolean => /^https:\/\//i.test(url);

/** The link the subject carries itself: the alert's `kibana.alert.url` or the Slack thread. */
const getOwnSubjectHref = ({ type, snapshot, slack }: SubjectRowData): string | undefined => {
  if (type === 'alert') {
    return snapshot?.url && isSafeHref(snapshot.url) ? snapshot.url : undefined;
  }
  if (type === 'slack_thread') {
    return slack?.permalink && isSafeSlackHref(slack.permalink) ? slack.permalink : undefined;
  }
  return undefined;
};

/**
 * Where a click on a subject goes: the link the subject carries (the alert's `kibana.alert.url`,
 * for example a Discover link, or the Slack thread), else the link a solution resolves for it
 * (for example the significant event, or the alert details page).
 */
export const getSubjectHref = (
  subject: SubjectRowData,
  resolveSubjectHref?: SubjectHrefResolver
): string | undefined => {
  const own = getOwnSubjectHref(subject);
  if (own !== undefined) {
    return own;
  }
  const resolved = resolveSubjectHref?.(subject);
  return resolved && isSafeHref(resolved) ? resolved : undefined;
};

/** {@link getSubjectHref} with the resolver from {@link SubjectHrefResolverContext}. */
export const useSubjectHref = (subject: SubjectRowData | undefined): string | undefined => {
  const resolveSubjectHref = useContext(SubjectHrefResolverContext);
  return subject ? getSubjectHref(subject, resolveSubjectHref) : undefined;
};
