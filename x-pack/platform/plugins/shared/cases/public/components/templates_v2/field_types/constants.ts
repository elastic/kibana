/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FieldType = {
  INPUT_TEXT: 'INPUT_TEXT',
  INPUT_NUMBER: 'INPUT_NUMBER',
  SELECT_BASIC: 'SELECT_BASIC',
  TEXTAREA: 'TEXTAREA',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const fieldTypesArray = Object.keys(FieldType) as FieldType[];

export const exampleTemplateDefinition = `
# name is required
name: Example template
# description is optional
description: A short description of the template
# severity is optional (low, medium, high, critical)
severity: low
# category is optional
category: General
# tags are optional
tags:
  - example
fields:
  - name: summary
    control: INPUT_TEXT
    label: Summary
    type: keyword
    metadata:
      default: Default summary text
  - name: effort
    control: INPUT_NUMBER
    label: Effort estimate
    type: integer
    metadata:
      default: 1
  - name: details
    control: TEXTAREA
    label: Details
    type: keyword
    metadata:
      default: Enter details here...
  - name: priority
    control: SELECT_BASIC
    label: Priority
    type: keyword
    metadata:
      default: medium
      options:
        - low
        - medium
        - high
        - urgent
`.trimStart();
