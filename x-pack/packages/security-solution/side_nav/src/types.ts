/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { EuiListGroupItemProps, IconType } from '@elastic/eui';

export enum SolutionSideNavItemPosition {
  top = 'top',
  bottom = 'bottom',
}

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
  position?: SolutionSideNavItemPosition;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}

export enum LinkCategoryType {
  title = 'title',
  collapsibleTitle = 'collapsibleTitle',
  accordion = 'accordion',
  separator = 'separator',
}

export interface LinkCategory<T extends string = string> {
  linkIds: readonly T[];
  label?: string;
  type?: LinkCategoryType;
}

export interface TitleLinkCategory<T extends string = string> extends LinkCategory<T> {
  type?: LinkCategoryType.title;
  label: string;
}
export const isTitleLinkCategory = (category: LinkCategory): category is TitleLinkCategory =>
  (category.type == null || category.type === LinkCategoryType.title) && category.label != null;

export interface AccordionLinkCategory<T extends string = string> extends LinkCategory<T> {
  type: LinkCategoryType.accordion;
  label: string;
}
export const isAccordionLinkCategory = (
  category: LinkCategory
): category is AccordionLinkCategory =>
  category.type === LinkCategoryType.accordion && category.label != null;

export interface SeparatorLinkCategory<T extends string = string> extends LinkCategory<T> {
  type: LinkCategoryType.separator;
}
export const isSeparatorLinkCategory = (
  category: LinkCategory
): category is SeparatorLinkCategory => category.type === LinkCategoryType.separator;

export type LinkCategories<T extends string = string> = Readonly<Array<LinkCategory<T>>>;

export type Tracker = (
  type: UiCounterMetricType,
  event: string | string[],
  count?: number | undefined
) => void;
