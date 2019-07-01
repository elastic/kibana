/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback, useState } from 'react';

type TabId = 'indicesAndFieldsTab' | 'logsTab';
const validTabIds: TabId[] = ['indicesAndFieldsTab', 'logsTab'];

export const useSourceConfigurationFlyoutState = ({
  initialVisibility = false,
  initialTab = 'indicesAndFieldsTab',
}: {
  initialVisibility?: boolean;
  initialTab?: TabId;
} = {}) => {
  const [isVisible, setIsVisible] = useState<boolean>(initialVisibility);
  const [activeTabId, setActiveTab] = useState(initialTab);

  const toggleIsVisible = useCallback(
    () => setIsVisible(isCurrentlyVisible => !isCurrentlyVisible),
    [setIsVisible]
  );

  const show = useCallback(
    (tabId?: TabId) => {
      if (tabId != null) {
        setActiveTab(tabId);
      }
      setIsVisible(true);
    },
    [setIsVisible]
  );
  const showIndicesConfiguration = useCallback(() => show('indicesAndFieldsTab'), [show]);
  const showLogsConfiguration = useCallback(() => show('logsTab'), [show]);
  const hide = useCallback(() => setIsVisible(false), [setIsVisible]);

  return {
    activeTabId,
    hide,
    isVisible,
    setActiveTab,
    show,
    showIndicesConfiguration,
    showLogsConfiguration,
    toggleIsVisible,
  };
};

export const isValidTabId = (value: any): value is TabId => validTabIds.includes(value);

export const SourceConfigurationFlyoutState = createContainer(useSourceConfigurationFlyoutState);
