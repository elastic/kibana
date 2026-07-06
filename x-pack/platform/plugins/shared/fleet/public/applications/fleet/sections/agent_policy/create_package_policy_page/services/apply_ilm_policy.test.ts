/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendUpdatePackage } from '../../../../hooks';

import { applyIlmPolicyChange } from './apply_ilm_policy';

jest.mock('../../../../hooks', () => ({
  sendUpdatePackage: jest.fn(),
}));

const mockSendUpdatePackage = sendUpdatePackage as jest.Mock;

const buildNotifications = () => ({
  toasts: {
    addSuccess: jest.fn(),
    addError: jest.fn(),
  },
});

const buildPackageInfo = (ilmPolicy?: string) =>
  ({
    installationInfo: {
      namespace_customization_settings: ilmPolicy ? { production: { ilm_policy: ilmPolicy } } : {},
    },
  } as any);

describe('applyIlmPolicyChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendUpdatePackage.mockResolvedValue({ data: null, error: null });
  });

  it('does nothing when namespace is empty', async () => {
    const notifications = buildNotifications();
    await applyIlmPolicyChange(
      'nginx',
      '1.0.0',
      '',
      'my-policy',
      buildPackageInfo(),
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).not.toHaveBeenCalled();
  });

  it('is a no-op when the selected policy matches the installed policy', async () => {
    const notifications = buildNotifications();
    await applyIlmPolicyChange(
      'nginx',
      '1.0.0',
      'production',
      'my-policy',
      buildPackageInfo('my-policy'),
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).not.toHaveBeenCalled();
  });

  it('sends the new ilm_policy when it differs from the installed policy', async () => {
    const notifications = buildNotifications();
    await applyIlmPolicyChange(
      'nginx',
      '1.0.0',
      'production',
      'new-policy',
      buildPackageInfo('old-policy'),
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).toHaveBeenCalledWith('nginx', '1.0.0', {
      namespace_customization_settings: { production: { ilm_policy: 'new-policy' } },
    });
    expect(notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('sends an empty settings object to clear the policy', async () => {
    const notifications = buildNotifications();
    await applyIlmPolicyChange(
      'nginx',
      '1.0.0',
      'production',
      undefined,
      buildPackageInfo('old-policy'),
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).toHaveBeenCalledWith('nginx', '1.0.0', {
      namespace_customization_settings: { production: {} },
    });
  });

  it('shows an error toast when sendUpdatePackage fails', async () => {
    const notifications = buildNotifications();
    mockSendUpdatePackage.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    await applyIlmPolicyChange(
      'nginx',
      '1.0.0',
      'production',
      'new-policy',
      buildPackageInfo(),
      notifications as any,
      'Nginx'
    );
    expect(notifications.toasts.addError).toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
