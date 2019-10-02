/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEmbeddable, displayErrorToast, setupEmbeddablesAPI } from './embedded_map_helpers';
import { npStart } from 'ui/new_platform';

jest.mock('ui/new_platform');
jest.mock('../../lib/settings/use_kibana_ui_setting');

jest.mock(
  '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy',
  () => ({
    start: {
      getEmbeddableFactory: () => ({
        createFromState: () => ({
          reload: jest.fn(),
        }),
      }),
    },
  })
);

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => '9e1f72a9-7c73-4b7f-a562-09940f7daf4a'),
  };
});

describe('embedded_map_helpers', () => {
  describe('displayErrorToast', () => {
    test('dispatches toast with correct title and message', () => {
      const mockToast = {
        toast: {
          color: 'danger',
          errors: ['message'],
          iconType: 'alert',
          id: '9e1f72a9-7c73-4b7f-a562-09940f7daf4a',
          title: 'Title',
        },
        type: 'addToaster',
      };
      const dispatchToasterMock = jest.fn();
      displayErrorToast('Title', 'message', dispatchToasterMock);
      expect(dispatchToasterMock.mock.calls[0][0]).toEqual(mockToast);
    });
  });

  describe('setupEmbeddablesAPI', () => {
    test('attaches SIEM_FILTER_ACTION, and detaches extra UI actions', () => {
      const applyFilterMock = jest.fn();
      setupEmbeddablesAPI(applyFilterMock);
      expect(npStart.plugins.uiActions.registerAction).toHaveBeenCalledTimes(1);
      expect(npStart.plugins.uiActions.detachAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('createEmbeddable', () => {
    test('attaches refresh action', async () => {
      const setQueryMock = jest.fn();
      await createEmbeddable([], '', 0, 0, setQueryMock);
      expect(setQueryMock).toHaveBeenCalledTimes(1);
    });
  });
});
