/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectType } from 'tsd';

import { createFormField, createFormFieldsMap, type FormField } from '../../form_field';

const firstName = createFormField('firstName');
expectType<FormField<'firstName', string, string>>(firstName);

const lastName = createFormField('lastName');
expectType<FormField<'lastName', string, string>>(lastName);

const fieldsMap = createFormFieldsMap([firstName, lastName]);
expectType<Record<'firstName' | 'lastName', FormField<'firstName' | 'lastName', string, string>>>(
  fieldsMap
);
