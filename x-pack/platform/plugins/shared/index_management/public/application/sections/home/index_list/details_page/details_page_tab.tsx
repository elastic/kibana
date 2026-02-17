/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import type { EuiBreadcrumb } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import type { Index } from '../../../../../../common';
import type { IndexDetailsTab, IndexDetailsTabId } from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';
import { DetailsPageOverview } from './details_page_overview';
import { DetailsPageOverviewV2 } from './details_page_overview/details_page_overview_v2';

interface Props {
  tabs: IndexDetailsTab[];
  tab: IndexDetailsTabId;
  index: Index;
  isNewDesignEnabled?: boolean;
}
export const DetailsPageTab: FunctionComponent<Props> = ({
  tabs,
  tab,
  index,
  isNewDesignEnabled = false,
}) => {
  const selectedTab = tabs.find((tabConfig) => tabConfig.id === tab);
  const {
    core: { getUrlForApp },
  } = useAppContext();

  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const breadcrumb: EuiBreadcrumb = selectedTab?.breadcrumb ?? { text: selectedTab?.name };
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indexDetails, breadcrumb);
  }, [selectedTab]);

  return selectedTab ? (
    selectedTab.renderTabContent({ index, getUrlForApp, euiTheme })
  ) : isNewDesignEnabled ? (
    <DetailsPageOverviewV2 indexDetails={index} />
  ) : (
    <DetailsPageOverview indexDetails={index} />
  );
};
