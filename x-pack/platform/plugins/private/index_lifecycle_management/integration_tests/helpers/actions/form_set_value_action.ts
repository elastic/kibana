/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

export function createFormSetValueAction<V extends string = string>(
  testBed: TestBed,
  dataTestSubject: string
) {
  const { form, component } = testBed;

  return async (value: V) => {
    await act(async () => {
      form.setInputValue(dataTestSubject, value);
    });
    component.update();
  };
}
