/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HeaderActionButton } from '@kbn/core-chrome-browser-components';
import { i18n } from '@kbn/i18n';

import type { SecurityNavControlRenderButtonProps } from './nav_control_component';

const USER_MENU_ARIA_LABEL = i18n.translate(
  'xpack.security.navControlComponent.userMenuAriaLabel',
  { defaultMessage: 'User menu' }
);

export const UserMenuComponent = ({
  isOpen,
  toggleMenu,
  avatar,
}: SecurityNavControlRenderButtonProps) => (
  <HeaderActionButton
    variant="plain"
    onClick={toggleMenu}
    aria-expanded={isOpen}
    aria-haspopup={true}
    aria-label={USER_MENU_ARIA_LABEL}
    data-test-subj="chromeNextUserMenuHeaderButton"
  >
    {avatar}
  </HeaderActionButton>
);
