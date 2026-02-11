/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, act } from '@testing-library/react';
import { renderWithRouter } from './render';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';
import { AutoFollowPatternList } from '../../../app/sections/home/auto_follow_pattern_list';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

/**
 * @param {object} [props]
 * @returns {ReturnType<typeof renderWithRouter>}
 */
export const setup = (props = {}) => {
  const result = renderWithRouter(AutoFollowPatternList, {
    store: createCrossClusterReplicationStore(),
    onRouter: (router) => {
      routing.reactRouter = {
        ...router,
        history: {
          ...router.history,
          parentHistory: {
            createHref: () => '',
            push: () => {},
          },
        },
        getUrlForApp: () => '',
      };
    },
    defaultProps: props,
  });

  return {
    ...result,
    // Helper actions for this specific page
    actions: {
      async selectAutoFollowPatternAt(index) {
        const table = new EuiTableTestHarness('autoFollowPatternListTable');
        const checkbox = within(table.getRows()[index]).getByRole('checkbox');
        await result.user.click(checkbox);
      },

      async clickBulkDeleteButton() {
        const btn = screen.getByTestId('autoFollowPatternActionMenuButton');
        await result.user.click(btn);

        const contextMenu = screen.getByTestId('autoFollowPatternActionContextMenu');
        const deleteBtn = within(contextMenu).getAllByRole('button')[1];
        await result.user.click(deleteBtn);
      },

      async clickConfirmModalDeleteAutoFollowPattern() {
        const confirmBtn = screen.getByTestId('confirmModalConfirmButton');
        await result.user.click(confirmBtn);
        // Wait for delete HTTP request and list reload
        await act(async () => {
          // eslint-disable-next-line no-undef
          await jest.runOnlyPendingTimersAsync();
        });
      },

      async clickAutoFollowPatternAt(index) {
        const link = screen.getAllByTestId('autoFollowPatternLink')[index];
        await result.user.click(link);
      },

      async clickPaginationNextButton() {
        const table = screen.getByTestId('autoFollowPatternListTable');
        const nextBtn = within(table).getByTestId('pagination-button-next');
        await result.user.click(nextBtn);
      },

      async search(value) {
        const input = screen.getByTestId('autoFollowPatternSearch');
        await result.user.clear(input);
        await result.user.type(input, value);
      },
    },
  };
};
