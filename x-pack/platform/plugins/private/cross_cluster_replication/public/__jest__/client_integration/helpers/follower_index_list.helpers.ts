/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';
import { renderWithRouter, type CcrRenderResult, type OnRouterPayload } from './render';
import { FollowerIndicesList } from '../../../app/sections/home/follower_indices_list';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing, type CcrReactRouter } from '../../../app/services/routing';

interface FollowerIndexListActions {
  selectFollowerIndexAt: (index: number) => Promise<void>;
  openContextMenu: () => Promise<void>;
  clickContextMenuButtonAt: (index: number) => Promise<void>;
  openTableRowContextMenuAt: (index: number) => Promise<void>;
  clickFollowerIndexAt: (index: number) => Promise<void>;
  clickPaginationNextButton: () => Promise<void>;
}

export type FollowerIndexListSetupResult = CcrRenderResult & {
  actions: FollowerIndexListActions;
};

export const setup = (
  componentProps: Partial<ComponentProps<typeof FollowerIndicesList>> = {}
): FollowerIndexListSetupResult => {
  const result = renderWithRouter(FollowerIndicesList, {
    store: createCrossClusterReplicationStore(),
    onRouter: (router: OnRouterPayload) => {
      const ccrRouter: CcrReactRouter = {
        ...router,
        getUrlForApp: () => '',
      };
      routing.reactRouter = ccrRouter;
    },
    componentProps,
  });

  return {
    ...result,
    actions: {
      async selectFollowerIndexAt(index: number) {
        const table = new EuiTableTestHarness('followerIndexListTable');
        const checkbox = within(table.getRows()[index]).getByRole('checkbox');
        await result.user.click(checkbox);
      },

      async openContextMenu() {
        const btn = screen.getByTestId('contextMenuButton');
        await result.user.click(btn);
      },

      async clickContextMenuButtonAt(index: number) {
        const menu = screen.getByTestId('contextMenu');
        const buttons = within(menu).getAllByRole('button');
        await result.user.click(buttons[index]);
      },

      async openTableRowContextMenuAt(index: number) {
        const table = new EuiTableTestHarness('followerIndexListTable');
        const cells = within(table.getRows()[index]).getAllByRole('cell');
        const actionsCell = cells[cells.length - 1];
        if (!actionsCell) {
          throw new Error('expected actions cell');
        }
        const btn = within(actionsCell).getByRole('button');
        await result.user.click(btn);
      },

      async clickFollowerIndexAt(index: number) {
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
