/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import { AttachmentType } from '../../common';
import { CASE_ATTACH_EVENTS_EVENT_TYPE } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { isRegisteredOwner } from '../files';
import type { CaseAttachmentWithoutOwner } from '../types';

/**
 * Events Based Tracking for Case Event attachments being created
 */
export const useAttachEventsEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (attachmentSource: string, attachments: CaseAttachmentWithoutOwner[]) => {
      // NOTE: we just want to track case event attachments
      if (!attachments.some((attachment) => attachment.type === AttachmentType.event)) {
        return;
      }

      analytics.reportEvent(CASE_ATTACH_EVENTS_EVENT_TYPE, {
        owner: owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown',
        attachment_source: attachmentSource,
      });
    },
    [analytics, owner]
  );
};
