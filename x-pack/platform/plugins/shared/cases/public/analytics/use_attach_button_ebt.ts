/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import {
  CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';

export type AttachLocation = 'activity' | 'attachments';
export type AttachMenuItemType = 'file' | 'timeline' | 'saved_object';

/**
 * Events Based Tracking for clicking the Case View attach button
 */
export const useAttachButtonClickedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (attachLocation: AttachLocation) => {
      analytics.reportEvent(CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        attach_location: attachLocation,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for selecting an option in the Case View attach menu
 */
export const useAttachMenuItemClickedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (attachmentType: AttachMenuItemType) => {
      analytics.reportEvent(CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        attachment_type: attachmentType,
      });
    },
    [analytics, owner]
  );
};
