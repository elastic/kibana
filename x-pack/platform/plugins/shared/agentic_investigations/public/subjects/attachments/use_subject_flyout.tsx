/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isModifiedClick } from './subject_link';
import { canOpenSubjectFlyout, type SubjectServices } from './subject_services';
import type { SubjectRowData } from './subject_title';

/** The flyout pulls in the alerting v2 episode UI, so it loads when a subject is clicked. */
const LazySubjectDetailsFlyout = React.lazy(async () => {
  const { SubjectDetailsFlyout } = await import('./subject_details_flyout');
  return { default: SubjectDetailsFlyout };
});

export interface SubjectFlyout {
  /**
   * The click handler: opens the flyout when one can open now, else hands the click to the caller's
   * own link. A new-tab or new-window click keeps the browser's own behavior.
   */
  onClick: (event: React.MouseEvent) => void;
  /** The open flyout, to render next to the element that was clicked; `null` while closed. */
  flyout: React.ReactNode;
  canOpenFlyout: boolean;
}

/**
 * The flyout an alert subject opens next to the investigation, so the user does not leave it: the
 * alert's details, or the flyout a solution registered for the alert's source. With
 * `onlyRegistered`, only that registered flyout: the caller keeps its own link for other alerts.
 * Whether a flyout can open is decided when the link is clicked, not when it renders: a solution
 * registers its flyout after this plugin starts, which can be after the link is on screen.
 */
export const useSubjectFlyout = (
  subject: SubjectRowData | undefined,
  detailsHref?: string,
  {
    onlyRegistered = false,
    onLinkClick,
  }: { onlyRegistered?: boolean; onLinkClick?: (event: React.MouseEvent) => void } = {}
): SubjectFlyout => {
  const { services } = useKibana<SubjectServices>();
  const [isOpen, setIsOpen] = useState(false);
  const source = subject?.snapshot?.source;
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    // These flyouts open without taking focus from the page (`ownFocus={false}`), and closing one
    // leaves focus on the page body rather than on what opened it (checked in a browser), so hand
    // it back. It covers a flyout a solution registered, too.
    const element = opener.current;
    opener.current = null;
    window.requestAnimationFrame(() => element?.focus());
  }, []);

  const canOpen = useCallback((): boolean => {
    if (!subject) {
      return false;
    }
    const isRegistered = services.getAlertFlyout?.(source, subject.snapshot) !== undefined;
    if (subject.type !== 'alert') {
      return false;
    }
    return onlyRegistered ? isRegistered : canOpenSubjectFlyout(services, source, subject.snapshot);
  }, [subject, source, services, onlyRegistered]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!canOpen()) {
        onLinkClick?.(event);
        return;
      }
      if (isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      opener.current = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
      setIsOpen(true);
    },
    [canOpen, onLinkClick]
  );

  const flyout =
    isOpen && subject ? (
      <React.Suspense fallback={null}>
        <LazySubjectDetailsFlyout
          alertId={subject.id}
          source={source}
          snapshot={subject.snapshot}
          detailsHref={detailsHref}
          onClose={close}
          services={services}
        />
      </React.Suspense>
    ) : null;

  return { onClick, flyout, canOpenFlyout: canOpen() };
};
