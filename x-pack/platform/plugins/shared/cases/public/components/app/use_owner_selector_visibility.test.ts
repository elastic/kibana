/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SOLUTION_VIEW_CLASSIC } from '@kbn/spaces-plugin/common/constants';

import {
  KIBANA_OBSERVABILITY_PROJECT,
  KIBANA_SECURITY_PROJECT,
  KIBANA_OBSERVABILITY_SOLUTION,
} from '@kbn/projects-solutions-groups';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useAvailableCasesOwners } from './use_available_owners';
import { useActiveSolution } from './use_active_solution';
import { useOwnerSelectorVisibility } from './use_owner_selector_visibility';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { allCasesPermissions } from '../../common/mock';

jest.mock('../cases_context/use_cases_context');
jest.mock('./use_available_owners');
jest.mock('./use_active_solution');
const useCasesContextMock = useCasesContext as jest.MockedFunction<typeof useCasesContext>;
const useAvailableCasesOwnersMock = useAvailableCasesOwners as jest.MockedFunction<
  typeof useAvailableCasesOwners
>;
const useActiveSolutionMock = useActiveSolution as jest.MockedFunction<typeof useActiveSolution>;
const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

describe('useOwnerSelectorVisibility', () => {
  beforeEach(() => {
    useCasesContextMock.mockReturnValue({
      owner: [], // we are in dashboards app and owner is a) empty on observability b) securitySolution in security. Confirm with security what should be the proper owner value. kibana-presentation team confirmed it is a bug on the security side.
      isServerless: false,
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      permissions: allCasesPermissions(),
      basePath: '',
      features: {
        alerts: { sync: true, enabled: true, isExperimental: false },
        metrics: [],
        observables: { enabled: true },
      },
      releasePhase: 'experimental',
      dispatch: jest.fn(),
      settings: { displayIncrementalCaseId: false },
    });
  });

  describe('when active solution is classic', () => {
    beforeEach(() => {
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution', 'observability', 'cases']);
      useActiveSolutionMock.mockReturnValue(SOLUTION_VIEW_CLASSIC);
    });
    it('returns default owner value as APP_ID', () => {
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.defaultOwnerValue).toBe('cases');
    });
    it('shows owner selector when multiple owners are available', () => {
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(true);
    });

    it('does not show owner selector when only one owner is available', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(false);
    });

    // currently it returns cases as default owner value instead of securitySolution, need to fix this
    it.skip('preselects security solution when only securitySolution is available and dropdown is hidden', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.defaultOwnerValue).toBe('securitySolution');
    });

    // currently it returns cases as default owner value instead of observability, need to fix this
    it.skip('preselects observability when only observability owner is available and dropdown is hidden', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['observability']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.defaultOwnerValue).toBe('observability');
    });
  });

  describe('when active solution is observability', () => {
    beforeEach(() => {
      useActiveSolutionMock.mockReturnValue(KIBANA_OBSERVABILITY_PROJECT);
      useAvailableCasesOwnersMock.mockReturnValue([KIBANA_OBSERVABILITY_SOLUTION]);
    });
    it('returns default owner value as observability', () => {
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.defaultOwnerValue).toBe(KIBANA_OBSERVABILITY_SOLUTION);
    });

    it('does not show owner selector', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['observability', 'cases']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(false);
    });
  });

  describe('when active solution is security', () => {
    beforeEach(() => {
      useActiveSolutionMock.mockReturnValue(KIBANA_SECURITY_PROJECT);
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
    });
    it('returns default owner value as securitySolution', () => {
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.defaultOwnerValue).toBe('securitySolution');
    });
    it('does not show owner selector', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution', 'cases']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(false);
    });
  });

  describe('when in serverless mode', () => {
    beforeEach(() => {
      useCasesContextMock.mockReturnValue({
        owner: [], // we are in dashboards app and owner is a) empty on observability b) securitySolution in security. Confirm with security what should be the proper owner value. kibana-presentation team confirmed it is a bug on the security side.
        isServerless: true,
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        permissions: allCasesPermissions(),
        basePath: '',
        features: {
          alerts: { sync: true, enabled: true, isExperimental: false },
          metrics: [],
          observables: { enabled: true },
        },
        releasePhase: 'experimental',
        dispatch: jest.fn(),
        settings: { displayIncrementalCaseId: false },
      });
    });

    it('does not show owner selector on security project build', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(false);
    });

    it('does not show owner selector on oblt project build', () => {
      useAvailableCasesOwnersMock.mockReturnValue(['observability']);
      const { result } = renderHook(() => useOwnerSelectorVisibility());
      expect(result.current.shouldShowOwnerSelector).toBe(false);
    });
  });
});
