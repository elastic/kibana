/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
  /** Whether a plain click opens the flyout, here, instead of following the subject's link. */
  opensFlyout: boolean;
  /** Opens the flyout on a plain click; a new-tab or new-window click keeps the browser's own. */
  onClick: (event: React.MouseEvent) => void;
  /** The open flyout, to render next to the element that was clicked; `null` while closed. */
  flyout: React.ReactNode;
}

/**
 * The flyout an alert subject opens next to the investigation, so the user does not leave it: the
 * alert's details, or the flyout a solution registered for the alert's source. With
 * `onlyRegistered`, only that registered flyout: the caller keeps its own link for other alerts.
 */
export const useSubjectFlyout = (
  subject: SubjectRowData | undefined,
  detailsHref?: string,
  { onlyRegistered = false }: { onlyRegistered?: boolean } = {}
): SubjectFlyout => {
  const { services } = useKibana<SubjectServices>();
  const [isOpen, setIsOpen] = useState(false);
  const source = subject?.snapshot?.source;
  const opensFlyout =
    subject?.type === 'alert' &&
    (onlyRegistered
      ? services.getAlertFlyout?.(source, subject.snapshot) !== undefined
      : canOpenSubjectFlyout(services, source, subject.snapshot));
  const close = useCallback(() => setIsOpen(false), []);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!opensFlyout || isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      setIsOpen(true);
    },
    [opensFlyout]
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

  return { opensFlyout, onClick, flyout };
};
