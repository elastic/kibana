/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

import { documentationService } from '../../../../services/documentation';
import { componentHelpers, MappingsEditorTestBed } from './helpers';

const { setup } = componentHelpers.mappingsEditor;

jest.mock('../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

describe('Mappings editor: mapper-size plugin support (esNodesPlugins prop)', () => {
  let testBed: MappingsEditorTestBed;
  const onChangeHandler: jest.Mock = jest.fn();

  const defaultMappings = {
    properties: {},
    dynamic_templates: [],
  };

  const ctx = {
    config: {
      enableMappingsSourceFieldSection: true,
    },
    core: { application: {}, http: {} },
    services: {
      notificationService: { toasts: {} },
    },
    docLinks: docLinksServiceMock.createStartContract(),
    plugins: {
      ml: { mlApi: {} },
    },
  };

  beforeAll(() => {
    documentationService.setup(docLinksServiceMock.createStartContract());
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setupWithPlugins = async (esNodesPlugins: string[]) => {
    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler, esNodesPlugins }, ctx);
    });
    testBed.component.update();
  };

  test('passes installed node plugins to the advanced configuration form', async () => {
    await setupWithPlugins(['mapper-size']);

    const {
      actions: { selectTab },
      exists,
    } = testBed;

    await selectTab('advanced');

    expect(exists('sizeEnabledToggle')).toBe(true);
  });

  test("doesn't substitute an installed node plugin when the plugin list is empty", async () => {
    await setupWithPlugins([]);

    const {
      actions: { selectTab },
      exists,
    } = testBed;

    await selectTab('advanced');

    expect(exists('sizeEnabledToggle')).toBe(false);
  });

  test('updates the advanced configuration form when node plugins finish loading', async () => {
    await setupWithPlugins([]);

    const {
      actions: { selectTab },
      exists,
      setProps,
      component,
    } = testBed;

    await selectTab('advanced');
    expect(exists('sizeEnabledToggle')).toBe(false);

    await act(async () => {
      setProps({
        value: defaultMappings,
        onChange: onChangeHandler,
        esNodesPlugins: ['mapper-size'],
      });
    });
    component.update();

    expect(exists('sizeEnabledToggle')).toBe(true);
  });
});
