/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeletedRule } from '../../../common/types';
import type { DeleteProfileModalProps } from './delete_profile_modal';
import { DeleteProfileModal } from './delete_profile_modal';

const RULES: DeletedRule[] = [
  { name: 'catalog-staging', fallbacks: [] },
  {
    name: 'product-catalog',
    fallbacks: [
      {
        name: 'products',
        nextRuleName: 'default_indices',
        nextProfileName: '_performant_indices',
      },
      { name: '.products-backup' },
    ],
  },
  { name: 'catalog-search', fallbacks: [{ name: 'catalog-search-2026' }] },
];

const renderModal = (props: Partial<DeleteProfileModalProps> = {}) => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const onRetryLoad = jest.fn();
  render(
    <DeleteProfileModal
      profileName="catalog-fast"
      type="indices"
      rules={RULES}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onRetryLoad={onRetryLoad}
      {...props}
    />
  );
  return { onCancel, onConfirm, onRetryLoad };
};

const getBody = () => screen.getByTestId('searchBoostDeleteProfileModalBody').textContent;

const getRuleRows = () => screen.getAllByTestId('searchBoostDeletedRule');

describe('DeleteProfileModal', () => {
  it('says the profile is deleted alone when no rule uses it', () => {
    renderModal({ rules: [] });

    expect(screen.getByText('Delete boost profile "catalog-fast"?')).toBeInTheDocument();
    expect(getBody()).toBe("This permanently deletes the profile. You can't undo this action.");
    expect(screen.queryByTestId('searchBoostDeletedRulesList')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
  });

  it('says the rules that use the profile are deleted and what falls back', () => {
    renderModal();

    expect(getBody()).toBe(
      "Deleting this profile will also delete the 3 boost rules that use it. The 3 affected indices will fall back to the next matching rule, if there is one. You can't undo this action."
    );
    expect(
      screen.getByRole('button', { name: 'Delete 1 profile and 3 rules' })
    ).toBeInTheDocument();
  });

  it('uses the singular wording for one rule and one data stream', () => {
    renderModal({
      type: 'data_streams',
      rules: [
        {
          name: 'logs-oracle',
          fallbacks: [
            {
              name: 'logs-oracle-default',
              nextRuleName: 'default_data_streams',
              nextProfileName: '_performant_data_streams',
            },
          ],
        },
      ],
    });

    expect(getBody()).toBe(
      "Deleting this profile will also delete the boost rule that uses it. The 1 affected data stream will fall back to the next matching rule. You can't undo this action."
    );
    expect(screen.getByRole('button', { name: 'Delete 1 profile and 1 rule' })).toBeInTheDocument();
  });

  it('leaves out the fall back sentence when the rules apply to nothing', () => {
    renderModal({ rules: [{ name: 'catalog-staging', fallbacks: [] }] });

    expect(getBody()).toBe(
      "Deleting this profile will also delete the boost rule that uses it. You can't undo this action."
    );
  });

  it('lists the rules sorted by name, with a count for those that apply to something', () => {
    renderModal();

    const rows = getRuleRows();
    expect(rows.map((row) => (within(row).queryByRole('button') ?? row).textContent)).toEqual([
      'catalog-search1 index',
      'catalog-staging',
      'product-catalog2 indices',
    ]);
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens one rule at a time to show what it applies to', async () => {
    renderModal();

    const [catalogSearch, , productCatalog] = getRuleRows();
    await userEvent.click(within(productCatalog).getByRole('button'));

    const table = within(productCatalog).getByTestId('searchBoostDeletedRuleTable');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Affected index', 'New rule', 'New profile']);
    expect(
      within(table)
        .getAllByTestId('searchBoostDeletedRuleTableRow')
        .map((row) => row.textContent)
    ).toEqual(['.products-backup——', 'productsdefault_indices_performant_indices']);
    expect(within(productCatalog).getByRole('button')).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(within(catalogSearch).getByRole('button'));

    expect(within(catalogSearch).getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(within(productCatalog).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  describe('rule tables', () => {
    const originalMatchMedia = window.matchMedia;

    const setCanAnimate = (canAnimate: boolean) => {
      window.matchMedia = jest.fn().mockReturnValue({
        matches: canAnimate,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      });
    };

    const endHeightTransition = (accordion: HTMLElement) =>
      act(() => {
        const event = new Event('transitionend', { bubbles: true });
        Object.defineProperty(event, 'propertyName', { value: 'height' });
        accordion.dispatchEvent(event);
      });

    const getTable = (accordion: HTMLElement) =>
      within(accordion).queryByTestId('searchBoostDeletedRuleTable');

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('renders a table only once its rule opens, keeping it until the rule finishes closing', async () => {
      setCanAnimate(true);
      renderModal();
      const [catalogSearch, , productCatalog] = getRuleRows();

      expect(screen.queryByTestId('searchBoostDeletedRuleTable')).not.toBeInTheDocument();

      await userEvent.click(within(productCatalog).getByRole('button'));
      await userEvent.click(within(catalogSearch).getByRole('button'));
      await userEvent.click(within(catalogSearch).getByRole('button'));

      expect(getTable(productCatalog)).toBeInTheDocument();
      expect(getTable(catalogSearch)).toBeInTheDocument();

      endHeightTransition(productCatalog);

      expect(getTable(productCatalog)).not.toBeInTheDocument();
      expect(getTable(catalogSearch)).toBeInTheDocument();

      endHeightTransition(catalogSearch);

      expect(getTable(catalogSearch)).not.toBeInTheDocument();
    });

    it('removes a table whose collapse never ends, after a while', async () => {
      jest.useFakeTimers();
      try {
        setCanAnimate(true);
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        renderModal();
        const [, , productCatalog] = getRuleRows();

        await user.click(within(productCatalog).getByRole('button'));
        await user.click(within(productCatalog).getByRole('button'));

        expect(getTable(productCatalog)).toBeInTheDocument();

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(getTable(productCatalog)).not.toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it('lets keyboard users focus the rules list, showing the focus ring around open tables', async () => {
      renderModal();

      // The first tab stop is the modal itself.
      await userEvent.tab();
      await userEvent.tab();

      const list = screen.getByRole('region', { name: 'Boost rules to be deleted' });
      expect(list).toHaveFocus();
      expect(list.parentElement).toHaveStyleRule('outline', expect.stringContaining('solid'), {
        target: ":has(> [role='region']:focus-visible)",
      });
    });

    it('lets keyboard users move from an open rule into its own scrolling table', async () => {
      const fallbacks = Array.from({ length: 15 }, (_, index) => ({
        name: `logs-nginx-${String(index + 1).padStart(2, '0')}`,
      }));
      renderModal({ rules: [{ name: 'logs-nginx', fallbacks }, ...RULES] });
      const [, , logsNginx] = getRuleRows();

      await userEvent.click(within(logsNginx).getByRole('button'));
      await userEvent.tab();

      const table = within(logsNginx).getByRole('table');
      expect(table).toHaveFocus();
      expect(table).toHaveStyleRule('overflow-y', 'auto');
      expect(within(table).getAllByTestId('searchBoostDeletedRuleTableRow')).toHaveLength(15);
      expect(
        within(table).getAllByTestId('searchBoostDeletedRuleTableRow').at(-1)
      ).toHaveTextContent('logs-nginx-15');
    });

    it('removes a table as soon as its rule closes when motion is reduced', async () => {
      setCanAnimate(false);
      renderModal();
      const [, , productCatalog] = getRuleRows();

      await userEvent.click(within(productCatalog).getByRole('button'));
      await userEvent.click(within(productCatalog).getByRole('button'));

      expect(getTable(productCatalog)).not.toBeInTheDocument();
    });
  });

  it('calls back on cancel and confirm', async () => {
    const { onCancel, onConfirm } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete 1 profile and 3 rules' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables confirming while the rules that use the profile load', () => {
    renderModal({ rules: [], isLoading: true });

    expect(screen.queryByTestId('searchBoostDeleteProfileModalBody')).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBoostModalConfirm')).toBeDisabled();
  });

  it('shows a load error with a way to try again, and disables confirming', async () => {
    const { onRetryLoad } = renderModal({
      rules: [],
      loadError: new Error('Request timed out'),
    });

    expect(screen.getByTestId('searchBoostModalLoadError').textContent).toContain(
      'Request timed out'
    );
    expect(screen.getByTestId('searchBoostModalConfirm')).toBeDisabled();

    await userEvent.click(screen.getByTestId('searchBoostModalRetryLoad'));

    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner in the confirm button while deleting', () => {
    renderModal({ isDeleting: true });

    const confirmButton = screen.getByTestId('searchBoostModalConfirm');
    expect(within(confirmButton).getByRole('progressbar')).toBeInTheDocument();
  });

  it('closes with Escape or the close button', async () => {
    const { onCancel } = renderModal();

    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Closes this modal window' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("can't be closed while deleting", async () => {
    const { onCancel } = renderModal({ isDeleting: true });

    expect(screen.getByTestId('searchBoostModalCancel')).toBeDisabled();
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Closes this modal window' }));

    expect(onCancel).not.toHaveBeenCalled();
  });
});
