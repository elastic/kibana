/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendUpdatePackage } from '../../../../hooks';

import { applyNamespaceCustomizationChange } from './apply_namespace_customization';

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

describe('applyNamespaceCustomizationChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendUpdatePackage.mockResolvedValue({ data: null, error: null });
  });

  it('does nothing when namespace is empty', async () => {
    const notifications = buildNotifications();
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      '',
      true,
      [],
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).not.toHaveBeenCalled();
  });

  it('adds the namespace when enabling and it was not in the list', async () => {
    const notifications = buildNotifications();
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      'production',
      true,
      ['staging'],
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).toHaveBeenCalledWith('nginx', '1.0.0', {
      namespace_customization_enabled_for: ['staging', 'production'],
    });
    expect(notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('removes the namespace when disabling and it was in the list', async () => {
    const notifications = buildNotifications();
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      'production',
      false,
      ['production', 'staging'],
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).toHaveBeenCalledWith('nginx', '1.0.0', {
      namespace_customization_enabled_for: ['staging'],
    });
  });

  it('is a no-op when the desired state matches the current state', async () => {
    const notifications = buildNotifications();
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      'production',
      true,
      ['production'],
      notifications as any,
      'Nginx'
    );
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      'production',
      false,
      [],
      notifications as any,
      'Nginx'
    );
    expect(mockSendUpdatePackage).not.toHaveBeenCalled();
  });

  it('shows an error toast when sendUpdatePackage fails', async () => {
    const notifications = buildNotifications();
    mockSendUpdatePackage.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    await applyNamespaceCustomizationChange(
      'nginx',
      '1.0.0',
      'production',
      true,
      [],
      notifications as any,
      'Nginx'
    );
    expect(notifications.toasts.addError).toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
