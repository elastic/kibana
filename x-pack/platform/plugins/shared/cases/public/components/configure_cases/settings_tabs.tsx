/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  getCasesConfigurePath,
  getCasesConfigureTemplatesPath,
} from '../../common/navigation/paths';
import { SETTINGS_TAB_GENERAL, SETTINGS_TAB_TEMPLATES } from './translations';

interface SettingsTabsProps {
  activeTab: 'general' | 'templates';
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab }) => {
  const { basePath } = useCasesContext();
  const history = useHistory();

  return (
    <EuiTabs>
      <EuiTab
        isSelected={activeTab === 'general'}
        onClick={() => history.push(getCasesConfigurePath(basePath))}
      >
        {SETTINGS_TAB_GENERAL}
      </EuiTab>
      <EuiTab
        isSelected={activeTab === 'templates'}
        onClick={() => history.push(getCasesConfigureTemplatesPath(basePath))}
      >
        {SETTINGS_TAB_TEMPLATES}
      </EuiTab>
    </EuiTabs>
  );
};

SettingsTabs.displayName = 'SettingsTabs';
