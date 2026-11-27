/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCapability, type AnyCapability } from '@kbn/custom-app-registry';
import { registerBuiltinActions } from '../actions/manifests';
import { badgeCapability } from './badge/manifest';
import { stackCapability } from './stack/manifest';
import { flyoutCapability } from './flyout/manifest';
import { cardCapability } from './card/manifest';
import { columnsCapability } from './columns/manifest';
import { sectionCapability } from './section/manifest';
import { tabsCapability } from './tabs/manifest';
import { accordionCapability } from './accordion/manifest';
import { keyValueCapability } from './key_value/manifest';
import { tableCapability } from './table/manifest';
import { buttonCapability } from './button/manifest';
import { linkCapability } from './link/manifest';
import { formCapability } from './form/manifest';
import { selectCapability } from './select/manifest';
import { buttonGroupCapability } from './button_group/manifest';
import { searchCapability } from './search/manifest';
import { switchCapability } from './switch/manifest';
import { listInputCapability } from './list_input/manifest';
import { timeRangeCapability } from './time_range/manifest';
import { calloutCapability } from './callout/manifest';
import { headingCapability } from './heading/manifest';
import { metricCapability } from './metric/manifest';
import { progressCapability } from './progress/manifest';
import { textCapability } from './text/manifest';
import { statCapability } from './stat/manifest';
import { embeddableCapability } from './embeddable/manifest';

/**
 * The capabilities that ship with custom apps. A new one is a folder of its own and a line here: the
 * schema, the types, the guide and the checks follow from this list.
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
  buttonCapability,
  linkCapability,
  formCapability,
  selectCapability,
  buttonGroupCapability,
  searchCapability,
  switchCapability,
  listInputCapability,
  timeRangeCapability,
  embeddableCapability,
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

/** Registers the capabilities that ship with custom apps. It can be called more than once. */
export const registerBuiltinCapabilities = (): void => {
  registerBuiltinActions();
  [...BUILTIN_CAPABILITIES, ...BUILTIN_CONTAINERS].forEach((capability) =>
    registerCapability(capability as unknown as AnyCapability)
  );
};
