/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../../../common/types';
import type { CaseUI } from '../../../../../common';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { toUnifiedAttachmentType } from '../../../../../common/utils/attachments/migration_utils';
import { FILE_ATTACHMENT_TYPE } from '../../../../../common/constants';
import { useUrlParams } from '../../../../common/navigation';

interface TabComponentProps {
  caseData: CaseUI;
  key?: string;
  searchTerm?: string;
}

export type TabComponent = FC<TabComponentProps>;

const ATTACHMENT_TABS = [
  CASE_VIEW_PAGE_TABS.ALERTS,
  CASE_VIEW_PAGE_TABS.EVENTS,
  CASE_VIEW_PAGE_TABS.FILES,
  CASE_VIEW_PAGE_TABS.OBSERVABLES,
];

const getActiveTabId = (tabId?: string) => {
  if (tabId && Object.values(CASE_VIEW_PAGE_TABS).includes(tabId as CASE_VIEW_PAGE_TABS)) {
    return tabId;
  }
  return CASE_VIEW_PAGE_TABS.ACTIVITY;
};

interface UseCaseViewTabsArgs {
  caseData: CaseUI;
}

export const useCaseViewTabs = ({ caseData }: UseCaseViewTabsArgs) => {
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  const { urlParams } = useUrlParams();

  const activeTabId = getActiveTabId(urlParams?.tabId);
  const isAttachmentTab = ATTACHMENT_TABS.includes(activeTabId as CASE_VIEW_PAGE_TABS);

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  const EventTabComponent = useMemo(() => {
    const eventType = toUnifiedAttachmentType('event', owner);
    if (!unifiedAttachmentTypeRegistry.has(eventType)) {
      return undefined;
    }
    return unifiedAttachmentTypeRegistry.get(eventType)?.getAttachmentTabViewObject?.()?.children;
  }, [unifiedAttachmentTypeRegistry, owner]);

  const AlertTabComponent = useMemo(() => {
    const alertType = toUnifiedAttachmentType('alert', owner);
    if (!unifiedAttachmentTypeRegistry.has(alertType)) {
      return undefined;
    }
    return unifiedAttachmentTypeRegistry.get(alertType)?.getAttachmentTabViewObject?.()?.children;
  }, [unifiedAttachmentTypeRegistry, owner]);

  const FileTabComponent = useMemo(() => {
    if (!unifiedAttachmentTypeRegistry.has(FILE_ATTACHMENT_TYPE)) {
      return undefined;
    }
    return unifiedAttachmentTypeRegistry.get(FILE_ATTACHMENT_TYPE)?.getAttachmentTabViewObject?.()
      ?.children;
  }, [unifiedAttachmentTypeRegistry]);

  return {
    activeTabId,
    isAttachmentTab,
    EventTabComponent,
    AlertTabComponent,
    FileTabComponent,
  };
};
