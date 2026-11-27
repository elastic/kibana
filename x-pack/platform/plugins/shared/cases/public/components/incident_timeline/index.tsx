/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { EuiAccordion, EuiPanel, EuiSkeletonText, EuiTitle } from '@elastic/eui';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { CaseUI } from '../../../common/ui/types';
import { KibanaServices, useKibana } from '../../common/lib/kibana';
import { INCIDENT_TIMELINE_PANEL_ID, useIncidentTimelineFocus } from './focus_context';
import * as i18n from './translations';

export { IncidentTimelineFocusProvider } from './focus_context';

const OPEN_STORAGE_KEY = 'cases.incidentTimeline.isOpen';

const IncidentTimelineContentLazy = React.lazy(() =>
  import('./incident_timeline_content').then(({ IncidentTimelineContent }) => ({
    default: IncidentTimelineContent,
  }))
);

/** Prototype scope: behind the config flag, Security cases only. */
export const isIncidentTimelineEnabled = (owner: string): boolean =>
  KibanaServices.getConfig()?.incidentTimeline?.enabled === true &&
  owner === SECURITY_SOLUTION_OWNER;

export const IncidentTimelinePanel: React.FC<{ caseData: CaseUI }> = ({ caseData }) => {
  const { storage } = useKibana().services;
  const focus = useIncidentTimelineFocus();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return storage.get(OPEN_STORAGE_KEY) !== false;
    } catch {
      return true;
    }
  });

  const onToggle = (open: boolean) => {
    setIsOpen(open);
    try {
      storage.set(OPEN_STORAGE_KEY, open);
    } catch {
      // Storage can be unavailable (private mode, quota); the panel still works for this visit.
    }
  };

  const focusRequest = focus?.request;
  useEffect(() => {
    if (focusRequest) setIsOpen(true);
  }, [focusRequest]);

  return (
    <EuiPanel hasBorder paddingSize="m" id={INCIDENT_TIMELINE_PANEL_ID}>
      <EuiAccordion
        id="cases-incident-timeline"
        buttonContent={
          <EuiTitle size="xs">
            <h2>{i18n.PANEL_TITLE}</h2>
          </EuiTitle>
        }
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={onToggle}
        data-test-subj="incident-timeline-panel"
      >
        {isOpen && (
          <Suspense fallback={<EuiSkeletonText lines={3} />}>
            <IncidentTimelineContentLazy caseData={caseData} />
          </Suspense>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};

IncidentTimelinePanel.displayName = 'IncidentTimelinePanel';
