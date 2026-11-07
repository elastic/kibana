/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoreStart, MountPoint } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { notifyProfileDeletion } from './profile_deletion_notice';

const createServices = () => {
  const close = jest.fn();
  const services = {
    notifications: { toasts: { addSuccess: jest.fn(), addDanger: jest.fn() } },
    overlays: { openModal: jest.fn(() => ({ close })) },
    rendering: {
      addContext: (node: ReactNode) => <IntlProvider locale="en">{node}</IntlProvider>,
    },
  };
  return { services: services as unknown as CoreStart, ...services, close };
};

// Renders a toast's or modal's content the way Kibana mounts it.
const mount = (mountPoint: MountPoint) => {
  const element = document.createElement('div');
  document.body.appendChild(element);
  act(() => {
    mountPoint(element);
  });
  return within(element);
};

describe('notifyProfileDeletion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('says the profile was deleted, counting its rules when it had any', () => {
    const { services, notifications } = createServices();

    notifyProfileDeletion(services, 'catalog-search', { ruleCount: 0, failures: [] });
    notifyProfileDeletion(services, 'catalog-search', { ruleCount: 2, failures: [] });

    expect(notifications.toasts.addSuccess.mock.calls).toEqual([
      ['Deleted boost profile "catalog-search"'],
      ['Deleted boost profile "catalog-search" and 2 rules'],
    ]);
  });

  it('says which rules failed to delete, which kept the profile, in its details', async () => {
    const { services, notifications, overlays, close } = createServices();

    notifyProfileDeletion(services, 'catalog-search', {
      ruleCount: 2,
      failures: [
        { kind: 'rule', name: 'archives', message: "Elasticsearch didn't respond in time." },
      ],
    });

    const [[{ title, text }]] = notifications.toasts.addDanger.mock.calls as unknown as Array<
      [{ title: string; text: MountPoint }]
    >;
    expect(title).toBe('Unable to delete boost profile "catalog-search"');
    const toast = mount(text);
    expect(
      toast.getByText("Couldn't delete 1 of the 2 rules that use it, so the profile was kept.")
    ).toBeInTheDocument();

    await userEvent.click(toast.getByRole('button', { name: 'View details' }));
    const [[modalMount, options]] = overlays.openModal.mock.calls as unknown as Array<
      [MountPoint, { 'aria-labelledby': string }]
    >;
    const modal = mount(modalMount);
    // The title labels the modal.
    expect(screen.getByText(title).id).toBe(options['aria-labelledby']);
    const [header, row] = within(modal.getByTestId('boostDeletionFailures')).getAllByRole('row');
    expect(header).toHaveTextContent('Boost ruleError');
    expect(row).toHaveTextContent("archivesElasticsearch didn't respond in time.");

    await userEvent.click(modal.getByRole('button', { name: 'Close' }));
    expect(close).toHaveBeenCalled();
  });

  it("says when the profile failed to delete after its rules didn't", () => {
    const { services, notifications } = createServices();

    notifyProfileDeletion(services, 'catalog-search', {
      ruleCount: 1,
      failures: [
        {
          kind: 'profile',
          name: 'catalog-search',
          message: "Elasticsearch didn't respond in time.",
        },
      ],
    });

    const [[{ text }]] = notifications.toasts.addDanger.mock.calls as unknown as Array<
      [{ text: MountPoint }]
    >;
    expect(
      mount(text).getByText('Deleted the rule that used it, but not the profile.')
    ).toBeInTheDocument();
  });

  it('shows the error itself for a profile without rules', () => {
    const { services, notifications } = createServices();

    notifyProfileDeletion(services, 'catalog-search', {
      ruleCount: 0,
      failures: [
        {
          kind: 'profile',
          name: 'catalog-search',
          message: "Elasticsearch didn't respond in time.",
        },
      ],
    });

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Unable to delete boost profile "catalog-search"',
      text: "Elasticsearch didn't respond in time.",
    });
  });
});
