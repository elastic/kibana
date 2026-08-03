/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import type { SetupResult } from './processor.helpers';
import { setup, getProcessorValue, setupEnvironment } from './processor.helpers';

const JOIN_TYPE = 'join';

describe('Processor: Join', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();

    await act(async () => {
      testBed = await setup(httpSetup, {
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });

    const { component, actions } = testBed;

    component.update();

    // Open flyout to add new processor
    actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await actions.addProcessorType(JOIN_TYPE);
  });

  test('allows a whitespace separator', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add required fields
    form.setInputValue('fieldNameField.input', 'field_1');
    form.setInputValue('separatorValueField.input', ' ');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, JOIN_TYPE);

    expect(processors[0]?.[JOIN_TYPE]).toEqual({
      field: 'field_1',
      separator: ' ',
    });
  });
});
