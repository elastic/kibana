/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType } from '../../../../common/types/domain/template/fields';
import type { FieldType as FieldTypeType } from '../../../../common/types/domain/template/fields';

export const fieldTypesArray = Object.keys(FieldType) as FieldTypeType[];

export const exampleTemplateDefinition = `
# Case defaults applied when this template creates a case.
# Keep this starter intentionally small; add more fields only when your workflow needs them.
name: Example case title
description: A short default case description
severity: low
category: General
tags:
  - example
assignees: []
fields:
  - name: summary
    control: INPUT_TEXT
    label: Summary
    type: keyword
  - name: requires_escalation
    control: TOGGLE
    label: Requires escalation
    type: keyword
    metadata:
      default: false
  # Shown and required only when escalation is toggled on.
  - name: escalation_reason
    control: TEXTAREA
    label: Escalation reason
    type: keyword
    display:
      show_when:
        field: requires_escalation
        operator: eq
        value: true
    validation:
      required_when:
        field: requires_escalation
        operator: eq
        value: true
  # Required before a case can move to the closed state.
  - name: resolution_notes
    control: TEXTAREA
    label: Resolution notes
    type: keyword
    validation:
      required_on_close: true
`.trimStart();
