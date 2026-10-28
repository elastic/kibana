/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { usePipelinesPrivileges } from './use_pipelines_privileges';

const mockUseKibana = jest.fn();

jest.mock('../../shared_imports', () => ({
  ...jest.requireActual('../../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

const renderWithCapabilities = ({
  canRead,
  canManage,
}: {
  canRead: boolean;
  canManage: boolean;
}) => {
  mockUseKibana.mockReturnValue({
    services: { config: { enableManageProcessors: false, canRead, canManage } },
  });

  return renderHook(() => usePipelinesPrivileges()).result.current;
};

describe('usePipelinesPrivileges', () => {
  describe('WHEN the user has the read and manage capabilities', () => {
    it('SHOULD allow reading and managing', () => {
      expect(renderWithCapabilities({ canRead: true, canManage: true })).toEqual({
        canRead: true,
        canManage: true,
      });
    });
  });

  describe('WHEN the user only has the read capability', () => {
    it('SHOULD allow reading but not managing', () => {
      expect(renderWithCapabilities({ canRead: true, canManage: false })).toEqual({
        canRead: true,
        canManage: false,
      });
    });
  });

  describe('WHEN the user has the manage capability but not the read capability', () => {
    it('SHOULD allow reading and managing', () => {
      expect(renderWithCapabilities({ canRead: false, canManage: true })).toEqual({
        canRead: true,
        canManage: true,
      });
    });
  });

  describe('WHEN the user has no pipeline capabilities', () => {
    it('SHOULD allow neither reading nor managing', () => {
      expect(renderWithCapabilities({ canRead: false, canManage: false })).toEqual({
        canRead: false,
        canManage: false,
      });
    });
  });
});
