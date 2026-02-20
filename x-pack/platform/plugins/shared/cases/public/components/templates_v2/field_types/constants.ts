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
# tags are optional
tags:
  - example
fields:
  - name: severity
    control: SELECT_BASIC
    label: Select label
    type: keyword
    metadata:
      options:
        - low
        - moderate
        - high
        - critical
  - name: name
    control: INPUT_TEXT
    label: Input text label
    type: keyword
  - name: effort
    control: INPUT_NUMBER
    label: Input number label
    type: integer
  - name: details
    control: TEXTAREA
    label: Textarea label
    type: keyword
`.trimStart();
