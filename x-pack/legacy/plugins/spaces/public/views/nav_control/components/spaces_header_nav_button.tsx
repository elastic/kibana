/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiHeaderSectionItemButton,
} from '@elastic/eui';
import React from 'react';
import { ButtonProps } from '../types';

export const SpacesHeaderNavButton: React.FC<ButtonProps> = props => (
  <EuiHeaderSectionItemButton
    aria-controls="headerSpacesMenuList"
    aria-expanded={props.spaceSelectorShown}
    aria-haspopup="true"
    aria-label={props.linkTitle}
    title={props.linkTitle}
    onClick={props.toggleSpaceSelector}
  >
    {props.linkIcon}
  </EuiHeaderSectionItemButton>
);
