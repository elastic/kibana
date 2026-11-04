/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCapability, type AnyCapability } from '@kbn/custom-app-registry';
import { badgeCapability } from './badge';
import { stackCapability } from './stack';
import { flyoutCapability } from './flyout';
import { cardCapability } from './card';
import { columnsCapability } from './columns';
import { sectionCapability } from './section';
import { tabsCapability } from './tabs';
import { accordionCapability } from './accordion';
import { keyValueCapability } from './key_value';
import { tableCapability } from './table';
import { customContentCapability } from './custom_content';
import { chartCapability } from './chart';
import { buttonCapability } from './button';
import { linkCapability } from './link';
import { formCapability } from './form';
import { selectCapability } from './select';
import { buttonGroupCapability } from './button_group';
import { searchCapability } from './search';
import { switchCapability } from './switch';
import { listInputCapability } from './list_input';
import { timeRangeCapability } from './time_range';
import { calloutCapability } from './callout';
import { headingCapability } from './heading';
import { metricCapability } from './metric';
import { progressCapability } from './progress';
import { textCapability } from './text';
import { statCapability } from './stat';

/**
 * The capabilities that ship with the package. A new one is added here, and nowhere else in the
 * package: the schema, the types and the checks follow from this list.
 */
export const BUILTIN_CAPABILITIES = [
  headingCapability,
  textCapability,
  calloutCapability,
  statCapability,
  metricCapability,
  progressCapability,
  badgeCapability,
  keyValueCapability,
  tableCapability,
  customContentCapability,
  chartCapability,
  buttonCapability,
  linkCapability,
  formCapability,
  selectCapability,
  buttonGroupCapability,
  searchCapability,
  switchCapability,
  listInputCapability,
  timeRangeCapability,
] as const;

/** The capabilities that hold other components. */
export const BUILTIN_CONTAINERS = [
  stackCapability,
  flyoutCapability,
  cardCapability,
  columnsCapability,
  sectionCapability,
  tabsCapability,
  accordionCapability,
] as const;

/** Registers the capabilities that ship with the package. It can be called more than once. */
export const registerBuiltinCapabilities = (): void => {
  [...BUILTIN_CAPABILITIES, ...BUILTIN_CONTAINERS].forEach((capability) =>
    registerCapability(capability as unknown as AnyCapability)
  );
};
