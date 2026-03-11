/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { SHOW_REQUEST_MODAL_CREATE_TAB, SHOW_REQUEST_MODAL_UPDATE_TAB } from '../../translations';
import type { ShowRequestActivePage } from '../../types';

interface ShowRequestTabsProps {
  activeTab: ShowRequestActivePage;
  onTabChange: (tab: ShowRequestActivePage) => void;
}

export const ShowRequestTabs = ({ activeTab, onTabChange }: ShowRequestTabsProps) => (
  <EuiTabs>
    <EuiTab
      isSelected={activeTab === 'create'}
      onClick={() => onTabChange('create')}
      data-test-subj="showRequestCreateTab"
    >
      {SHOW_REQUEST_MODAL_CREATE_TAB}
    </EuiTab>
    <EuiTab
      isSelected={activeTab === 'update'}
      onClick={() => onTabChange('update')}
      data-test-subj="showRequestUpdateTab"
    >
      {SHOW_REQUEST_MODAL_UPDATE_TAB}
    </EuiTab>
  </EuiTabs>
);
