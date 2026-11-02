/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, type IconColor, type IconSize, type IconType } from '@elastic/eui';
import React from 'react';

/** Leading icon size for {@link ItemRow} (24px). */
export const ITEM_ROW_ICON_SIZE: IconSize = 'l';

interface ItemRowIconProps {
  iconType: IconType;
  color?: IconColor;
}

/** Plain icon used as the leading icon in {@link ItemRow}. */
export const ItemRowIcon = ({ iconType, color = 'primary' }: ItemRowIconProps) => (
  <EuiIcon type={iconType} size={ITEM_ROW_ICON_SIZE} color={color} aria-hidden={true} />
);
