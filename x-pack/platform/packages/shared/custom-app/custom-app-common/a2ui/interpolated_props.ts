/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The properties, by type of component, whose text can refer to values of the app as
 * `{{state.key}}`. In A2UI they are dynamic strings: a text, or a call of `formatString` with the
 * values written as `${/key}`.
 */
export const INTERPOLATED_PROPS: Readonly<Record<string, readonly string[]>> = {
  heading: ['text'],
  text: ['text'],
  callout: ['title', 'text'],
  stat: ['title'],
  flyout: ['title'],
  metric: ['title'],
  chart: ['title'],
  card: ['title', 'description'],
  badge: ['text'],
  progress: ['label'],
  section: ['label'],
  link: ['label'],
};
