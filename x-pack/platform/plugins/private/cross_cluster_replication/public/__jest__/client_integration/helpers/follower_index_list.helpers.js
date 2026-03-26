/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import { renderWithRouter } from './render';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';
import { FollowerIndicesList } from '../../../app/sections/home/follower_indices_list';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

/**
 * @param {object} [props]
 * @returns {ReturnType<typeof renderWithRouter>}
 */
export const setup = (props = {}) => {
  const result = renderWithRouter(FollowerIndicesList, {
    store: createCrossClusterReplicationStore(),
    onRouter: (router) => {
      routing.reactRouter = {
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
    actions: {
      async selectFollowerIndexAt(index) {
        const table = new EuiTableTestHarness('followerIndexListTable');
        const checkbox = within(table.getRows()[index]).getByRole('checkbox');
        await result.user.click(checkbox);
      },

      async openContextMenu() {
        const btn = screen.getByTestId('contextMenuButton');
        await result.user.click(btn);
      },

      async clickContextMenuButtonAt(index) {
        const menu = screen.getByTestId('contextMenu');
        const buttons = within(menu).getAllByRole('button');
        await result.user.click(buttons[index]);
      },

      async openTableRowContextMenuAt(index) {
        const table = new EuiTableTestHarness('followerIndexListTable');
        const actionsCell = within(table.getRows()[index]).getAllByRole('cell').pop();
        const btn = within(actionsCell).getByRole('button');
        await result.user.click(btn);
      },

      async clickFollowerIndexAt(index) {
        const links = screen.getAllByTestId('followerIndexLink');
        await result.user.click(links[index]);
      },

      async clickPaginationNextButton() {
        const table = screen.getByTestId('followerIndexListTable');
        const nextBtn = within(table).getByTestId('pagination-button-next');
        await result.user.click(nextBtn);
      },
    },
  };
};
