/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { useCasesFeatures } from '../../../common/use_cases_features';

import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { useCasesConfig } from '../../../common/lib/kibana';
import { useGlobalInlineFields } from './use_global_inline_fields';
import React from 'react';

vi.mock('../../../common/use_cases_features');
vi.mock('../../../containers/configure/use_get_case_configuration');
vi.mock('../../../common/lib/kibana', async () => {
      const mocked = {
      ...(await vi.importActual('../../../common/lib/kibana')),
      useCasesConfig: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_global_inline_fields', async () => {
      const mocked = {
      ...(await vi.importActual('./use_global_inline_fields')),
      useGlobalInlineFields: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useGetCaseConfigurationMock = useGetCaseConfiguration as Mock;
const useCasesFeaturesMock = useCasesFeatures as Mock;
const useCasesConfigMock = useCasesConfig as Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as Mock;

describe('useCasesColumnsConfiguration ', () => {
  const license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useCasesFeaturesMock.mockReturnValue({
      caseAssignmentAuthorized: true,
    });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
    useCasesConfigMock.mockReturnValue({ templatesEnabled: false });
    useGlobalInlineFieldsMock.mockReturnValue({ globalInlineFields: [], isLoading: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all columns correctly', async () => {
    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "assignees": Object {
          "canDisplay": true,
          "field": "assignees",
          "isCheckedDefault": true,
          "name": "Assignees",
        },
        "category": Object {
          "canDisplay": true,
          "field": "category",
          "isCheckedDefault": true,
          "name": "Category",
        },
        "closedAt": Object {
          "canDisplay": true,
          "field": "closedAt",
          "isCheckedDefault": false,
          "name": "Closed on",
        },
        "createdAt": Object {
          "canDisplay": true,
          "field": "createdAt",
          "isCheckedDefault": true,
          "name": "Created on",
        },
        "externalIncident": Object {
          "canDisplay": true,
          "field": "externalIncident",
          "isCheckedDefault": true,
          "name": "External incident",
        },
        "severity": Object {
          "canDisplay": true,
          "field": "severity",
          "isCheckedDefault": true,
          "name": "Severity",
        },
        "status": Object {
          "canDisplay": true,
          "field": "status",
          "isCheckedDefault": true,
          "name": "Status",
        },
        "tags": Object {
          "canDisplay": true,
          "field": "tags",
          "isCheckedDefault": true,
          "name": "Tags",
        },
        "title": Object {
          "canDisplay": true,
          "field": "title",
          "isCheckedDefault": true,
          "name": "Name",
        },
        "totalAlerts": Object {
          "canDisplay": true,
          "field": "totalAlerts",
          "isCheckedDefault": true,
          "name": "Alerts",
        },
        "totalComment": Object {
          "canDisplay": true,
          "field": "totalComment",
          "isCheckedDefault": true,
          "name": "Comments",
        },
        "totalEvents": Object {
          "canDisplay": true,
          "field": "totalEvents",
          "isCheckedDefault": true,
          "name": "Events",
        },
        "updatedAt": Object {
          "canDisplay": true,
          "field": "updatedAt",
          "isCheckedDefault": true,
          "name": "Updated on",
        },
      }
    `);
  });

  it('cannot display assignees when case assignment is not authorized', async () => {
    useCasesFeaturesMock.mockReturnValue({
      caseAssignmentAuthorized: false,
    });

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current.assignees).toMatchInlineSnapshot(`
      Object {
        "canDisplay": false,
        "field": "assignees",
        "isCheckedDefault": true,
        "name": "Assignees",
      }
    `);
  });

  it('includes custom field columns correctly', async () => {
    const textKey = 'text_key';
    const toggleKey = 'toggle_key';

    const textLabel = 'Text Label';
    const toggleLabel = 'Toggle Label';

    useGetCaseConfigurationMock.mockImplementation(() => ({
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [
          { key: textKey, label: textLabel, type: CustomFieldTypes.TEXT },
          { key: toggleKey, label: toggleLabel, type: CustomFieldTypes.TOGGLE },
        ],
      },
    }));

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current[textKey]).toEqual({
      field: textKey,
      name: textLabel,
      canDisplay: true,
      isCheckedDefault: false,
    });
    expect(result.current[toggleKey]).toEqual({
      field: toggleKey,
      name: toggleLabel,
      canDisplay: true,
      isCheckedDefault: false,
    });
  });

  it('sources columns from global extended fields when templates v2 is enabled', async () => {
    useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
    // Legacy customFields must be ignored in favor of global field definitions.
    useGetCaseConfigurationMock.mockImplementation(() => ({
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [{ key: 'legacy_key', label: 'Legacy', type: CustomFieldTypes.TEXT }],
      },
    }));
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [
        { name: 'priority', type: 'keyword', control: FieldType.INPUT_TEXT, label: 'Priority' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current.legacy_key).toBeUndefined();
    expect(result.current.priority_as_keyword).toEqual({
      field: 'priority_as_keyword',
      name: 'Priority',
      canDisplay: true,
      isCheckedDefault: false,
    });
  });
});
