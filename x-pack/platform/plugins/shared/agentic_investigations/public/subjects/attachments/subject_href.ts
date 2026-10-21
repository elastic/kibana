/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { createContext, useCallback, useContext } from 'react';
import type { SubjectRowData } from './subject_title';

/**
 * Returns where a click on a subject goes, or `undefined` when the resolver does not know the
 * subject. Supplied by the solution that owns the subject's page (for example the significant
 * event or the alert details page).
 */
export type SubjectHrefResolver = (subject: SubjectRowData) => string | undefined;

/** How the subject rows link: the solutions' resolver and the in-app navigation. */
export interface SubjectLinks {
  resolveSubjectHref?: SubjectHrefResolver;
  /** `application.navigateToUrl`: opens a Kibana link without reloading the page. */
  navigateToUrl?: (url: string) => Promise<void>;
}

/** What the subject rows read; rendered by each entry point that shows subjects. */
export const SubjectLinksContext = createContext<SubjectLinks>({});

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
 * Where a click on a subject goes: the page a solution resolves for it (for example the significant
 * event, or the alert details page), else the link the subject carries (the alert's
 * `kibana.alert.url`, for example a Discover link, or the Slack thread).
 */
export const getSubjectHref = (
  subject: SubjectRowData,
  resolveSubjectHref?: SubjectHrefResolver
): string | undefined => {
  const resolved = resolveSubjectHref?.(subject);
  if (resolved && isSafeHref(resolved)) {
    return resolved;
  }
  return getOwnSubjectHref(subject);
};

/** {@link getSubjectHref} with the resolver from {@link SubjectLinksContext}. */
export const useSubjectHref = (subject: SubjectRowData | undefined): string | undefined => {
  const { resolveSubjectHref } = useContext(SubjectLinksContext);
  return subject ? getSubjectHref(subject, resolveSubjectHref) : undefined;
};

const isModifiedClick = (event: React.MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

/**
 * A click handler for a subject link that opens it inside Kibana, without a page reload. A
 * modified click (new tab, new window) keeps the browser's default.
 */
export const useSubjectLinkClick = (
  href: string | undefined
): ((event: React.MouseEvent) => void) | undefined => {
  const { navigateToUrl } = useContext(SubjectLinksContext);
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (href === undefined || navigateToUrl === undefined || isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      void navigateToUrl(href);
    },
    [href, navigateToUrl]
  );
  return href !== undefined && navigateToUrl !== undefined ? onClick : undefined;
};
