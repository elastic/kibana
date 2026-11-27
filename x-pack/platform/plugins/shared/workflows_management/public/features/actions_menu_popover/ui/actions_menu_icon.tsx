/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';

/**
 * An icon of a registered step or trigger, which may be given as a lazy component that is fetched the
 * first time it is drawn (hovering a category previews its steps). It has a boundary of its own: without
 * one, the icon suspends up to the menu's boundary, which hides the open modal and shows it again when
 * the icon arrives, so the modal appears to flash. The fallback has the icon's size, so nothing moves.
 */
export function ActionsMenuIcon(props: EuiIconProps) {
  const { size, color } = props;
  return (
    <React.Suspense fallback={<EuiIcon type="empty" size={size} color={color} aria-hidden />}>
      <EuiIcon {...props} />
    </React.Suspense>
  );
}
