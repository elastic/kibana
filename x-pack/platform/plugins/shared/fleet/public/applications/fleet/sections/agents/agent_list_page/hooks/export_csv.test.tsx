/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, type RenderHookResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { Agent } from '../../../../../../../common';
import { sendPostGenerateAgentsReport } from '../../../../../../hooks';

import { useExportCSV } from './export_csv';

jest.mock('../../../../../../hooks', () => ({
  sendPostGenerateAgentsReport: jest.fn(),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
    http: {
      basePath: {
        prepend: jest.fn((path) => path),
      },
    },
    uiSettings: {
      get: () => 'America/Los_Angeles',
    },
  }),
}));

describe('export_csv', () => {
  let renderResult: RenderHookResult<any, any>;

  function render() {
    const renderer = createFleetTestRendererMock();
    return renderer.renderHook(() => useExportCSV());
  }

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      renderResult = render();
    });
  });

  it('should generate reporting job for export csv with agent ids', () => {
    const agents = [{ id: 'agent1' }, { id: 'agent2' }] as Agent[];
    const sortOptions = {
      field: 'agent.id',
      direction: 'asc',
    };
    const columns = [{ field: 'agent.id' }];

    act(() => {
      renderResult.result.current(agents, columns, sortOptions);
    });

    expect(jest.mocked(sendPostGenerateAgentsReport)).toBeCalledWith({
      agents: ['agent1', 'agent2'],
      fields: ['agent.id'],
      timezone: 'America/Los_Angeles',
      sort: sortOptions,
    });
  });

  it('should generate reporting job for export csv with agents query', () => {
    const agents = 'policy_id:1 AND status:online';
    const columns = [{ field: 'agent.id' }];

    act(() => {
      renderResult.result.current(agents, columns, undefined);
    });

    expect(jest.mocked(sendPostGenerateAgentsReport)).toBeCalledWith({
      agents,
      fields: ['agent.id'],
      timezone: 'America/Los_Angeles',
    });
  });
});
