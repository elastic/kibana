/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiPanel, IconType } from '@elastic/eui';
import { ICON_HEIGHT_PANEL, ICON_HEIGHT_NATURAL } from './index';

export function IconPanel({ iconType }: { iconType: IconType }) {
  // use padding to push the icon to the center of the box before `scale()`ing up
  const padding = ICON_HEIGHT_PANEL / 2 - ICON_HEIGHT_NATURAL / 2;
  return (
    <EuiPanel
      style={{
        position: 'absolute',
        width: `${ICON_HEIGHT_PANEL}px`,
        height: `${ICON_HEIGHT_PANEL}px`,
        padding: `${padding}px`,
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
    >
      <EuiIcon type={iconType} size="original" style={{ transform: 'scale(3)' }} />
    </EuiPanel>
  );
}
