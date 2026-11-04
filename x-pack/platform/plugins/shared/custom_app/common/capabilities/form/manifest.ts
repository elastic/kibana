/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { actionsSchema } from '@kbn/custom-app-common';
import { MAX_FORM_FIELDS, MAX_HEADING_LENGTH } from '@kbn/custom-app-common';
import { formFieldSchema } from '@kbn/custom-app-common';

export const formCapability = defineCapability({
  kind: 'component',
  id: 'form',
  version: 1,
  props: lazySchema(() =>
    z.object({
      fields: z
        .array(formFieldSchema)
        .min(1)
        .max(MAX_FORM_FIELDS)
        .describe('The questions: text, textarea or select, each with the value it fills in.'),
      submitLabel: z
        .string()
        .min(1)
        .max(MAX_HEADING_LENGTH)
        .describe('The words on the submit button.'),
      onSubmit: actionsSchema
        .default([])
        .describe('The actions to run once the answers are in their values.'),
    })
  ),
  doc: {
    summary:
      'Asks for answers, and acts on them only when it is submitted. Its fields are of kind "text", "textarea" or "select". Use it when a workflow needs something a person must write or choose, such as a reason or an urgency, and not for filtering (an input does that as it changes). Each field\'s "bind" is the name of a declared STRING value (a field of its own, so no two fields share one) that the answer is put in when the form is submitted; a "select" field needs "options" [{ value, label? }]; "required" fields must be answered before anything happens. The form\'s "onSubmit" runs after the answers are put in their values, so a runWorkflow there hands them over with { "fromState": "<bind>" }. A form has at most 10 fields and takes no row, so its inputs cannot use "fromColumn" (remember what it needs from a row click first, into values, and hand those over with "fromState").',
    whenToUse: 'To collect answers and hand them to a workflow. For filters use the inputs.',
    example: {
      type: 'form',
      id: 'report',
      fields: [{ kind: 'text', bind: 'reason', label: 'Reason' }],
      submitLabel: 'Send',
      onSubmit: [],
    },
  },
  events: { onSubmit: 'onSubmit' },
  private: true,
  bindings: (node) => node.fields.map(({ bind }) => bind),
  validate: (node, { issue }) => {
    const seenKeys = new Set<string>();
    node.fields.forEach((field) => {
      if (seenKeys.has(field.bind)) {
        issue(
          `Node "${node.id}" has two fields that set "${field.bind}"; each needs a value of its own`
        );
      }
      seenKeys.add(field.bind);
      if (field.kind === 'select') {
        const seen = new Set<string>();
        field.options.forEach(({ value }) => {
          if (seen.has(value)) {
            issue(`Node "${node.id}" has the option "${value}" more than once in "${field.label}"`);
          }
          seen.add(value);
        });
      }
    });
  },
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    form: CapabilityNodeOf<typeof formCapability>;
  }
}
