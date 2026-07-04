/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import * as i18n from '../../translations';

interface SidebarSectionSettingsButtonProps {
  'data-test-subj'?: string;
}

export const SidebarSectionSettingsButton: FC<SidebarSectionSettingsButtonProps> = ({
  'data-test-subj': dataTestSubj = 'sidebar-section-settings-button',
}) => {
  return (
    <EuiToolTip content={i18n.SECTION_SETTINGS_ARIA} disableScreenReaderOutput>
      <EuiButtonIcon
        data-test-subj={dataTestSubj}
        aria-label={i18n.SECTION_SETTINGS_ARIA}
        iconType="gear"
      />
    </EuiToolTip>
  );
};

SidebarSectionSettingsButton.displayName = 'SidebarSectionSettingsButton';
