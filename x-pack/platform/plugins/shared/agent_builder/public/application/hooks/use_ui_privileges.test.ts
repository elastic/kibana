/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUiPrivileges } from './use_ui_privileges';

const mockUseKibana = jest.fn();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockUseKibana(),
}));

describe('useUiPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isAdmin true when capability is set', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
              write: true,
              isAdmin: true,
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useUiPrivileges());

    expect(result.current.isAdmin).toBe(true);
  });

  it('returns isAdmin false when capability is false', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
              write: true,
              isAdmin: false,
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useUiPrivileges());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isAdmin false when agentBuilder capabilities are missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
      },
    });

    const { result } = renderHook(() => useUiPrivileges());

    expect(result.current.isAdmin).toBe(false);
  });

  it('derives feature-backed privileges from uiPrivileges keys', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
              write: false,
              manageAgents: true,
              manageTools: false,
              isAdmin: true,
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useUiPrivileges());

    expect(result.current.show).toBe(true);
    expect(result.current.write).toBe(false);
    expect(result.current.manageAgents).toBe(true);
    expect(result.current.manageTools).toBe(false);
    expect(result.current.isAdmin).toBe(true);
  });
});
