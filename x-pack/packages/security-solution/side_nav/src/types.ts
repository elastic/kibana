/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { EuiListGroupItemProps, IconType } from '@elastic/eui';

export interface SolutionSideNavItem<T extends string = string> {
  id: T;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  description?: string;
  items?: Array<SolutionSideNavItem<T>>;
  categories?: LinkCategories<T>;
  iconType?: IconType;
  labelSize?: EuiListGroupItemProps['size'];
  appendSeparator?: boolean;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}

export interface LinkCategory<T extends string = string> {
  label: string;
  linkIds: readonly T[];
}

export type LinkCategories<T extends string = string> = Readonly<Array<LinkCategory<T>>>;

export type Tracker = (
  type: UiCounterMetricType,
  event: string | string[],
  count?: number | undefined
) => void;
