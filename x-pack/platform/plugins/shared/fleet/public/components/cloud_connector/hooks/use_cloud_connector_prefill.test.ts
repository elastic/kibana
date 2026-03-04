/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import { useCloudConnectorPrefill } from './use_cloud_connector_prefill';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

const mockUseLocation = useLocation as jest.Mock;

const completionPathname =
  '/app/fleet/integrations/cloud_security_posture/complete-integration-setup/cspm';
const addIntegrationPathname =
  '/app/fleet/integrations/cloud_security_posture/add-integration/cspm';

describe('useCloudConnectorPrefill', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return prefill values when all params are present on the completion route', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search:
        '?role_arn=arn:aws:iam::123456789012:role/TestRole&external_id=uuid-123&account_type=single-account&stack_name=my-stack&region=us-east-1',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current).toEqual({
      roleArn: 'arn:aws:iam::123456789012:role/TestRole',
      externalId: 'uuid-123',
      accountType: 'single-account',
      stackName: 'my-stack',
      region: 'us-east-1',
      isPrefilled: true,
    });
  });

  it('should set isPrefilled to false when role_arn is missing', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search: '?external_id=uuid-123&account_type=single-account',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current.isPrefilled).toBe(false);
    expect(result.current.roleArn).toBeUndefined();
    expect(result.current.externalId).toBe('uuid-123');
  });

  it('should set isPrefilled to false when external_id is missing', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search: '?role_arn=arn:aws:iam::123456789012:role/TestRole',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current.isPrefilled).toBe(false);
    expect(result.current.roleArn).toBe('arn:aws:iam::123456789012:role/TestRole');
    expect(result.current.externalId).toBeUndefined();
  });

  it('should return isPrefilled false with all undefined when on a non-completion route', () => {
    mockUseLocation.mockReturnValue({
      pathname: addIntegrationPathname,
      search:
        '?role_arn=arn:aws:iam::123456789012:role/TestRole&external_id=uuid-123',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current).toEqual({ isPrefilled: false });
  });

  it('should return isPrefilled false when no params are present', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search: '',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current).toEqual({
      roleArn: undefined,
      externalId: undefined,
      accountType: undefined,
      stackName: undefined,
      region: undefined,
      isPrefilled: false,
    });
  });

  it('should handle URL-encoded values', () => {
    const encodedRoleArn = encodeURIComponent(
      'arn:aws:iam::123456789012:role/My-Role/With+Special'
    );
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search: `?role_arn=${encodedRoleArn}&external_id=uuid-123`,
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current.roleArn).toBe(
      'arn:aws:iam::123456789012:role/My-Role/With+Special'
    );
    expect(result.current.isPrefilled).toBe(true);
  });

  it('should parse organization-account type', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search:
        '?role_arn=arn:aws:iam::123:role/R&external_id=uuid&account_type=organization-account',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current.accountType).toBe('organization-account');
  });

  it('should return undefined accountType for invalid values', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search:
        '?role_arn=arn:aws:iam::123:role/R&external_id=uuid&account_type=invalid-type',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current.accountType).toBeUndefined();
    expect(result.current.isPrefilled).toBe(true);
  });

  it('should handle partial params (only required fields)', () => {
    mockUseLocation.mockReturnValue({
      pathname: completionPathname,
      search: '?role_arn=arn:aws:iam::123:role/R&external_id=uuid-456',
    });

    const { result } = renderHook(() => useCloudConnectorPrefill());

    expect(result.current).toEqual({
      roleArn: 'arn:aws:iam::123:role/R',
      externalId: 'uuid-456',
      accountType: undefined,
      stackName: undefined,
      region: undefined,
      isPrefilled: true,
    });
  });
});
