/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEmbeddable, displayErrorToast } from './embedded_map_helpers';
import { createUiNewPlatformMock } from 'ui/new_platform/__mocks__/helpers';
import { createPortalNode } from 'react-reverse-portal';

jest.mock('ui/new_platform');
jest.mock('../../lib/settings/use_kibana_ui_setting');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => '27261ae0-0bbb-11ea-b0ea-db767b07ea47'),
    v4: jest.fn(() => '9e1f72a9-7c73-4b7f-a562-09940f7daf4a'),
  };
});

const { npStart } = createUiNewPlatformMock();
npStart.plugins.embeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  createFromState: () => ({
    reload: jest.fn(),
  }),
}));

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

  describe('createEmbeddable', () => {
    test('attaches refresh action', async () => {
      const setQueryMock = jest.fn();
      await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        0,
        0,
        setQueryMock,
        createPortalNode(),
        npStart.plugins.embeddable
      );
      expect(setQueryMock).toHaveBeenCalledTimes(1);
    });

    test('attaches refresh action with correct reference', async () => {
      const setQueryMock = jest.fn(({ id, inspect, loading, refetch }) => refetch);
      const embeddable = await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        0,
        0,
        setQueryMock,
        createPortalNode(),
        npStart.plugins.embeddable
      );
      expect(setQueryMock.mock.calls[0][0].refetch).not.toBe(embeddable.reload);
      setQueryMock.mock.results[0].value();
      expect(embeddable.reload).toHaveBeenCalledTimes(1);
    });
  });
});
