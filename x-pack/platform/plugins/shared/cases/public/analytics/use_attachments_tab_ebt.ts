/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import {
  CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { isRegisteredOwner } from '../files';

/**
 * Events Based Tracking for Case View attachments tab
 */
export const useAttachmentsTabClickedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(() => {
    analytics.reportEvent(CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE, {
      owner: owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown',
    });
  }, [analytics, owner]);
};

/**
 * Events Based Tracking for Case View attachments sub tab
 */
export const useAttachmentsSubTabClickedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (attachmentType: string) => {
      analytics.reportEvent(CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE, {
        owner: owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown',
        attachment_type: attachmentType,
      });
    },
    [analytics, owner]
  );
};
