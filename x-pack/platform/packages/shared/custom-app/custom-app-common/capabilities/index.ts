/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The core capabilities. Exporting them from here, and not only listing them, is what lets a package
 * that imports this one see the types of their nodes.
 */
export { accordionCapability } from './accordion';
export { badgeCapability } from './badge';
export { buttonCapability } from './button';
export { buttonGroupCapability } from './button_group';
export { calloutCapability } from './callout';
export { cardCapability } from './card';
export { chartCapability } from './chart';
export { columnsCapability } from './columns';
export { customContentCapability } from './custom_content';
export { flyoutCapability } from './flyout';
export { formCapability } from './form';
export { headingCapability } from './heading';
export { keyValueCapability } from './key_value';
export { linkCapability } from './link';
export { listInputCapability } from './list_input';
export { metricCapability } from './metric';
export { progressCapability } from './progress';
export { searchCapability } from './search';
export { sectionCapability } from './section';
export { selectCapability } from './select';
export { stackCapability } from './stack';
export { statCapability } from './stat';
export { switchCapability } from './switch';
export { tableCapability } from './table';
export { tabsCapability } from './tabs';
export { textCapability } from './text';
export { timeRangeCapability } from './time_range';
export { BUILTIN_CAPABILITIES, BUILTIN_CONTAINERS, registerBuiltinCapabilities } from './builtin';
