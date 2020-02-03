/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockGraphStore, MockedGraphEnvironment } from './mocks';
import { AdvancedSettings, WorkspaceField } from '../types';
import { datasourceSelector, requestDatasource } from './datasource';
import { datasourceSaga } from './datasource.sagas';
import { fieldsSelector } from './fields';
import { updateSettings } from './advanced_settings';
import { IndexPattern } from '../../../../../../src/plugins/data/public';

const waitForPromise = () => new Promise(r => setTimeout(r));

describe('datasource saga', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      sagas: [datasourceSaga],
      mockedDepsOverwrites: {
        indexPatternProvider: {
          get: jest.fn(() =>
            Promise.resolve({
              title: 'test-pattern',
              getNonScriptedFields: () => [{ name: 'field1', type: 'string' }],
            } as IndexPattern)
          ),
        },
      },
    });
  });

  function dispatchRequest() {
    env.store.dispatch(
      requestDatasource({ type: 'indexpattern', id: '123', title: 'test-pattern' })
    );
  }

  it('should load new data source and populate fields', async () => {
    dispatchRequest();
    await waitForPromise();
    const resultingState = env.store.getState();
    expect(env.mockedDeps.indexPatternProvider.get).toHaveBeenCalledWith('123');
    expect(fieldsSelector(resultingState)[0].name).toEqual('field1');
  });

  it('should initialize workspace with the current advanced settings', async () => {
    const newSettings = { timeoutMillis: 123 } as AdvancedSettings;
    env.store.dispatch(updateSettings(newSettings));
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.createWorkspace).toHaveBeenCalledWith('test-pattern', newSettings);
  });

  it('should not carry over diversity field into new workspace', async () => {
    const newSettings = {
      timeoutMillis: 123,
      sampleDiversityField: { name: 'field1' } as WorkspaceField,
    } as AdvancedSettings;
    env.store.dispatch(updateSettings(newSettings));
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.createWorkspace).toHaveBeenCalledWith('test-pattern', {
      timeoutMillis: 123,
    });
  });

  it('should error with a toast and abort if index pattern is not found', async () => {
    (env.mockedDeps.indexPatternProvider.get as jest.Mock).mockRejectedValueOnce(new Error());
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalled();
    const resultingState = env.store.getState();
    expect(datasourceSelector(resultingState).current.type).toEqual('none');
  });
});
