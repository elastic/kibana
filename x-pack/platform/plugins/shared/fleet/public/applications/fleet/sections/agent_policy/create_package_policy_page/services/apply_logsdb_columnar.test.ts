/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';

import { sendUpdatePackage } from '../../../../hooks';

import { applyLogsdbColumnarChange } from './apply_logsdb_columnar';

jest.mock('../../../../hooks', () => ({ sendUpdatePackage: jest.fn() }));

const notifications = {
  toasts: { addError: jest.fn() },
} as unknown as NotificationsStart;

describe('applyLogsdbColumnarChange', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when the switch was not used', async () => {
    await applyLogsdbColumnarChange('nginx', '1.0.0', undefined, notifications, 'Nginx');

    expect(sendUpdatePackage).not.toHaveBeenCalled();
  });

  it('sends the choice through the update package API', async () => {
    jest.mocked(sendUpdatePackage).mockResolvedValue({ data: {}, error: null } as any);

    await applyLogsdbColumnarChange('nginx', '1.0.0', true, notifications, 'Nginx');

    expect(sendUpdatePackage).toHaveBeenCalledWith('nginx', '1.0.0', { logsdb_columnar: true });
    expect(notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('tells the user when the change is refused', async () => {
    const error = new Error('not ready');
    jest.mocked(sendUpdatePackage).mockResolvedValue({ data: null, error } as any);

    await applyLogsdbColumnarChange('nginx', '1.0.0', true, notifications, 'Nginx');

    expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Could not change the columnar index mode of Nginx',
    });
  });
});
