/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback, useState } from 'react';

import { useVisibilityState } from '../../utils/use_visibility_state';

type TabId = 'indicesAndFieldsTab' | 'logsTab';
const validTabIds: TabId[] = ['indicesAndFieldsTab', 'logsTab'];

export const useSourceConfigurationFlyoutState = ({
  initialVisibility = false,
  initialTab = 'indicesAndFieldsTab',
}: {
  initialVisibility?: boolean;
  initialTab?: TabId;
} = {}) => {
  const { isVisible, show, hide, toggle: toggleIsVisible } = useVisibilityState(initialVisibility);
  const [activeTabId, setActiveTab] = useState(initialTab);

  const showWithTab = useCallback(
    (tabId?: TabId) => {
      if (tabId != null) {
        setActiveTab(tabId);
      }
      show();
    },
    [show]
  );
  const showIndicesConfiguration = useCallback(() => showWithTab('indicesAndFieldsTab'), [show]);
  const showLogsConfiguration = useCallback(() => showWithTab('logsTab'), [show]);

  return {
    activeTabId,
    hide,
    isVisible,
    setActiveTab,
    show: showWithTab,
    showIndicesConfiguration,
    showLogsConfiguration,
    toggleIsVisible,
  };
};

export const isValidTabId = (value: any): value is TabId => validTabIds.includes(value);

export const SourceConfigurationFlyoutState = createContainer(useSourceConfigurationFlyoutState);
