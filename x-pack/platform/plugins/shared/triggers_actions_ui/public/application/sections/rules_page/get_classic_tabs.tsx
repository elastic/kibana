/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import type { History } from 'history';
import { i18n } from '@kbn/i18n';
import type { Section } from '../../constants';

export const getClassicTabs = (
  selectedSection: Section,
  authorizedToReadAnyRules: boolean,
  history: History
): AppHeaderTab[] => {
  const result: AppHeaderTab[] = [
    {
      id: 'rules',
      label: i18n.translate('xpack.triggersActionsUI.home.rulesTabTitle', {
        defaultMessage: 'Rules',
      }),
      isSelected: selectedSection === 'rules',
      onClick: () => history.push('/'),
      'data-test-subj': 'rulesTab',
    },
  ];
  if (authorizedToReadAnyRules) {
    result.push({
      id: 'logs',
      label: i18n.translate('xpack.triggersActionsUI.home.logsTabTitle', {
        defaultMessage: 'Logs',
      }),
      isSelected: selectedSection === 'logs',
      onClick: () => history.push('/logs'),
      'data-test-subj': 'logsTab',
    });
  }
  return result;
};
