/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

export type KiPageTabId = 'details' | 'document';

interface UseKiPageHeaderTabsArgs {
  showHeaderTabs: boolean;
  selectedTab: KiPageTabId;
  detailsTabHref: string;
  documentTabHref: string;
}

export const useKiPageHeaderTabs = ({
  showHeaderTabs,
  selectedTab,
  detailsTabHref,
  documentTabHref,
}: UseKiPageHeaderTabsArgs): AppHeaderTab[] | undefined =>
  useMemo((): AppHeaderTab[] | undefined => {
    if (!showHeaderTabs) {
      return undefined;
    }

    return [
      {
        id: 'details',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.content', {
          defaultMessage: 'Content',
        }),
        isSelected: selectedTab === 'details',
        href: detailsTabHref,
        'data-test-subj': 'contextViewKiTab-details',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DETAILS,
        }),
      },
      {
        id: 'document',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.document', {
          defaultMessage: 'Document',
        }),
        isSelected: selectedTab === 'document',
        href: documentTabHref,
        'data-test-subj': 'contextViewKiTab-document',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DOCUMENT,
        }),
      },
    ];
  }, [detailsTabHref, documentTabHref, selectedTab, showHeaderTabs]);
