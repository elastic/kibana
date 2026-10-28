/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { AuthorizationContext } from '@kbn/es-ui-shared-plugin/public';

import { usePipelinesPrivileges } from './use_pipelines_privileges';

const renderWithMissingClusterPrivileges = (missingClusterPrivileges: string[]) => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <AuthorizationContext.Provider
      value={{
        isLoading: false,
        apiError: null,
        privileges: {
          hasAllPrivileges: missingClusterPrivileges.length === 0,
          missingPrivileges: { cluster: missingClusterPrivileges },
        },
      }}
    >
      {children}
    </AuthorizationContext.Provider>
  );

  return renderHook(() => usePipelinesPrivileges(), { wrapper }).result.current;
};

describe('usePipelinesPrivileges', () => {
  describe('WHEN the user has all privileges', () => {
    it('SHOULD allow reading and managing', () => {
      expect(renderWithMissingClusterPrivileges([])).toEqual({
        canRead: true,
        canManage: true,
      });
    });
  });

  describe('WHEN the user only has read_pipeline', () => {
    it('SHOULD allow reading but not managing', () => {
      expect(
        renderWithMissingClusterPrivileges(['manage_pipeline', 'cluster:monitor/nodes/info'])
      ).toEqual({ canRead: true, canManage: false });
    });
  });

  describe('WHEN the user has manage privileges but read_pipeline is reported missing', () => {
    it('SHOULD allow reading and managing', () => {
      expect(renderWithMissingClusterPrivileges(['read_pipeline'])).toEqual({
        canRead: true,
        canManage: true,
      });
    });
  });

  describe('WHEN cluster:monitor/nodes/info and read_pipeline are missing', () => {
    it('SHOULD allow neither reading nor managing', () => {
      expect(
        renderWithMissingClusterPrivileges(['cluster:monitor/nodes/info', 'read_pipeline'])
      ).toEqual({ canRead: false, canManage: false });
    });
  });

  describe('WHEN the user has no pipeline privileges', () => {
    it('SHOULD allow neither reading nor managing', () => {
      expect(
        renderWithMissingClusterPrivileges([
          'manage_pipeline',
          'cluster:monitor/nodes/info',
          'read_pipeline',
        ])
      ).toEqual({ canRead: false, canManage: false });
    });
  });
});
