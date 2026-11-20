/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_INPUT_OPTIONS, OPTIONS_SOURCE_SUFFIX } from '@kbn/custom-app-common';
import { querySchema } from '@kbn/custom-app-common';
import { describedInputProps, inputOptionSchema } from '@kbn/custom-app-common';

export const selectCapability = defineCapability({
  kind: 'component',
  id: 'select',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedInputProps(),
      options: z
        .array(inputOptionSchema)
        .max(MAX_INPUT_OPTIONS)
        .default([])
        .describe('The choices, each with a value and an optional label.'),
      optionsQuery: querySchema
        .optional()
        .describe(
          'An ES|QL query whose first column is the value of each option, instead of options.'
        ),
      multiple: z
        .boolean()
        .optional()
        .describe(
          'Several options can be chosen, and the value it sets is a list. Nothing chosen is an empty list.'
        ),
    })
  ),
  doc: {
    summary:
      'A drop-down that sets a value of the app. At most 50 options. It can take its options from the data with "optionsQuery", an ES|QL query whose first column is the value of each option and whose optional second column is its label, for example FROM logs-* | STATS BY event.outcome | SORT event.outcome; they come after the ones in "options", so put an "All" option there (a value of "" or "*" that your queries treat as no filter). Use it instead of listing values that you only saw in the data once: it follows the period of the app, and it can use another value, as ?service, to narrow one select by another. A query may return at most 500 options. With "multiple": true a select lets people choose several options, and what it sets is a list (see Lists below).',
    whenToUse:
      'To choose one of several values, or some of them. For two or three choices use button_group.',
    example: {
      type: 'select',
      id: 'region',
      label: 'Region',
      bind: 'region',
      options: [{ value: '', label: 'All regions' }, { value: 'eu' }],
    },
  },
  events: { onChange: 'onChange' },
  bindings: (node) => [node.bind],
  bindingType: (node) => (node.multiple === true ? 'list' : 'string'),
  sources: (node) =>
    node.optionsQuery === undefined
      ? []
      : [{ suffix: OPTIONS_SOURCE_SUFFIX, query: node.optionsQuery }],
  validate: (node, { issue }) => {
    if (node.options.length === 0 && node.optionsQuery === undefined) {
      issue(`Node "${node.id}" has no options; give it some, or a query that returns them`);
    }
    const seen = new Set<string>();
    node.options.forEach(({ value }) => {
      if (seen.has(value)) issue(`Node "${node.id}" has the option "${value}" more than once`);
      seen.add(value);
    });
  },
  filter: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    select: CapabilityNodeOf<typeof selectCapability>;
  }
}
