/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SECURITY_SOLUTION_OWNER } from '../../../../common';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import CasesProvider from '../../cases_context';
import { ActionWrapper } from './action_wrapper';
import { getMockServices } from './mocks';
import type { CasesActionContextProps } from './types';

jest.mock('../../cases_context', () =>
  jest.fn().mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>)
);

jest.mock('../../../client/helpers/can_use_cases', () => {
  const actual = jest.requireActual('../../../client/helpers/can_use_cases');
  return {
    ...actual,
    canUseCases: jest.fn(),
  };
});

const mockCasePermissions = jest.fn().mockReturnValue({ create: true, update: true });

describe('ActionWrapper', () => {
  const props = {
    casesActionContextProps: {} as unknown as CasesActionContextProps,
    currentAppId: 'securitySolutionUI',
    services: getMockServices(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (canUseCases as jest.Mock).mockReturnValue(mockCasePermissions);
  });

  it('reads cases permissions', () => {
    render(
      <ActionWrapper {...props}>
        <div />
      </ActionWrapper>
    );
    expect(mockCasePermissions).toHaveBeenCalledWith([SECURITY_SOLUTION_OWNER]);
  });

  it('renders CasesProvider with correct props for Security solution', () => {
    render(
      <ActionWrapper {...props}>
        <div />
      </ActionWrapper>
    );
    expect((CasesProvider as jest.Mock).mock.calls[0][0].value).toMatchInlineSnapshot(`
      Object {
        "features": Object {
          "alerts": Object {
            "sync": true,
          },
        },
        "owner": Array [
          "securitySolution",
        ],
        "permissions": Object {
          "create": true,
          "update": true,
        },
      }
    `);
  });

  it('renders CasesProvider with correct props for stack management', () => {
    render(
      <ActionWrapper {...props} currentAppId="management">
        <div />
      </ActionWrapper>
    );

    expect((CasesProvider as jest.Mock).mock.calls[0][0].value).toMatchInlineSnapshot(`
      Object {
        "features": Object {
          "alerts": Object {
            "sync": false,
          },
        },
        "owner": Array [
          "cases",
        ],
        "permissions": Object {
          "create": true,
          "update": true,
        },
      }
    `);
  });

  it('renders CasesProvider with correct props for observability', () => {
    render(
      <ActionWrapper {...props} currentAppId="observability-overview">
        <div />
      </ActionWrapper>
    );

    expect((CasesProvider as jest.Mock).mock.calls[0][0].value).toMatchInlineSnapshot(`
      Object {
        "features": Object {
          "alerts": Object {
            "sync": false,
          },
        },
        "owner": Array [
          "observability",
        ],
        "permissions": Object {
          "create": true,
          "update": true,
        },
      }
    `);
  });

  it('renders CasesProvider with correct props for an application without cases', () => {
    render(
      <ActionWrapper {...props} currentAppId="dashboard">
        <div />
      </ActionWrapper>
    );

    expect((CasesProvider as jest.Mock).mock.calls[0][0].value).toMatchInlineSnapshot(`
      Object {
        "features": Object {
          "alerts": Object {
            "sync": false,
          },
        },
        "owner": Array [],
        "permissions": Object {
          "create": true,
          "update": true,
        },
      }
    `);
  });

  it('should check permission with undefined if owner is not found', () => {
    render(
      <ActionWrapper {...props} currentAppId="dashboard">
        <div />
      </ActionWrapper>
    );
    expect(mockCasePermissions).toBeCalledWith(undefined);
  });
});
