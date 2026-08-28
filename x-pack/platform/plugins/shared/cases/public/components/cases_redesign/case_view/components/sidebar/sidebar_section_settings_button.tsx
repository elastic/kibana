/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../../../translations';

interface SidebarSectionSettingsButtonProps {
  onClick?: () => void;
  'data-test-subj'?: string;
}

export const SidebarSectionSettingsButton: FC<SidebarSectionSettingsButtonProps> = ({
  onClick,
  'data-test-subj': dataTestSubj = 'sidebar-section-settings-button',
}) => {
  const { euiTheme } = useEuiTheme();
  const iconStyles = useMemo(
    () =>
      css`
        .euiButtonIcon__icon {
          color: ${euiTheme.colors.textSubdued};
        }
      `,
    [euiTheme]
  );

  return (
    <EuiToolTip content={i18n.SECTION_SETTINGS_ARIA} disableScreenReaderOutput>
      <EuiButtonIcon
        data-test-subj={dataTestSubj}
        aria-label={i18n.SECTION_SETTINGS_ARIA}
        iconType="gear"
        color="text"
        css={iconStyles}
        onClick={onClick}
      />
    </EuiToolTip>
  );
};

SidebarSectionSettingsButton.displayName = 'SidebarSectionSettingsButton';
