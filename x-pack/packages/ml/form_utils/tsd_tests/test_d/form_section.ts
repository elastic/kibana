/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectType } from 'tsd';

import { createFormSection, createFormSectionsMap, type FormSection } from '../../src/form_section';

const test1Section = createFormSection('test1');
expectType<FormSection<'test1'>>(test1Section);

const test2Section = createFormSection('test2');
expectType<FormSection<'test2'>>(test2Section);

const sectionsMap = createFormSectionsMap([test1Section, test2Section]);
expectType<Record<'test1' | 'test2', FormSection<'test1' | 'test2'>>>(sectionsMap);
