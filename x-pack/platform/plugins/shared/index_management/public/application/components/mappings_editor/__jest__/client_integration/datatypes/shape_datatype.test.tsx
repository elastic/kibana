/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import type { MappingsEditorTestBed } from '../helpers';
import { componentHelpers } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

// Parameters automatically added to the shape datatype when saved (with the default values)
export const defaultShapeParameters = {
  type: 'shape',
  coerce: false,
  ignore_malformed: false,
  ignore_z_value: true,
};

describe('Mappings editor: shape datatype', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let onChangeHandler: jest.Mock = jest.fn();
  let getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  let testBed: MappingsEditorTestBed;

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    onChangeHandler = jest.fn();
    getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  });

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'shape',
        },
      },
    };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      component,
      actions: { startEditField, updateFieldName, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');

    // Update the name of the field
    await updateFieldName('updatedField');

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added for fields which are not set
    const updatedMappings = {
      properties: {
        updatedField: {
          ...defaultShapeParameters,
        },
      },
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
