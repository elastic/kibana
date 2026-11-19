/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationServiceMock } from '@kbn/core/public/mocks';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { createOtherDashboardUpdateNotifier } from './other_dashboard_update_notifier';

const buildAttachment = (id: string, title = 'Other dashboard'): DashboardAttachment => ({
  id,
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin: 'dashboard-2',
  data: { title, panels: [] },
});

const setup = () => {
  const { toasts } = notificationServiceMock.createStartContract();
  toasts.addInfo.mockImplementation((toast) => ({
    id: `toast-${toasts.addInfo.mock.calls.length}`,
    ...(toast as object),
  }));
  const openAttachment = jest.fn();
  const notifier = createOtherDashboardUpdateNotifier({ toasts, openAttachment });
  return { toasts, openAttachment, notifier };
};

const getOpenAction = (toasts: ReturnType<typeof setup>['toasts'], call = 0) => {
  const [toast] = toasts.addInfo.mock.calls[call] as [
    { actionProps: { primary: { onClick: () => void } } }
  ];
  return toast.actionProps.primary.onClick;
};

describe('createOtherDashboardUpdateNotifier', () => {
  it('tells the user which dashboard the agent updated', () => {
    const { toasts, notifier } = setup();

    notifier.notify(buildAttachment('attachment-1'));

    expect(toasts.addInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The agent updated Other dashboard' })
    );
  });

  it('keeps one toast per attachment, replacing it on a later update', () => {
    const { toasts, notifier } = setup();

    notifier.notify(buildAttachment('attachment-1'));
    notifier.notify(buildAttachment('attachment-1', 'Renamed dashboard'));

    expect(toasts.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'toast-1' }));
    expect(toasts.addInfo).toHaveBeenCalledTimes(2);
  });

  it('opens the latest attachment from the toast and removes the toast', () => {
    const { toasts, openAttachment, notifier } = setup();
    const attachment = buildAttachment('attachment-1');

    notifier.notify(attachment);
    getOpenAction(toasts)();

    expect(openAttachment).toHaveBeenCalledWith(attachment);
    expect(toasts.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'toast-1' }));
  });

  it('removes every toast it showed', () => {
    const { toasts, notifier } = setup();

    notifier.notify(buildAttachment('attachment-1'));
    notifier.notify(buildAttachment('attachment-2'));
    notifier.removeAll();

    expect(toasts.remove).toHaveBeenCalledTimes(2);
  });
});
