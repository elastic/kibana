/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { EsDeprecations } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: ['/es_deprecations'],
    componentRoutePath: '/es_deprecations',
  },
  doMountAsync: true,
};

export type ElasticsearchTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { component, find } = testBed;

  /**
   * User Actions
   */

  const table = {
    clickRefreshButton: async () => {
      await act(async () => {
        find('refreshButton').simulate('click');
      });

      component.update();
    },
    clickDeprecationRowAt: async (
      deprecationType: 'mlSnapshot' | 'indexSetting' | 'reindex' | 'default' | 'clusterSetting',
      index: number
    ) => {
      await act(async () => {
        find(`deprecation-${deprecationType}`).at(index).simulate('click');
      });

      component.update();
    },
    clickReindexColumnAt: async (
      columnType: 'isCritical' | 'message' | 'type' | 'index' | 'correctiveAction',
      index: number
    ) => {
      await act(async () => {
        find(`reindexTableCell-${columnType}`).at(index).simulate('click');
      });

      component.update();
    },
  };

  const clickFilterByIndex = async (index: number) => {
    await act(async () => {
      // EUI doesn't support data-test-subj's on the filter buttons, so we must access via CSS selector
      find('searchBarContainer')
        .find('.euiPopover')
        .find('button.euiFilterButton')
        .at(index)
        .simulate('click');
    });

    component.update();

    // Wait for the filter dropdown to be displayed
    await new Promise(requestAnimationFrame);
  };

  const searchBar = {
    clickTypeFilterDropdown: async () => {
      await clickFilterByIndex(1); // Type filter is the second filter button
    },
    clickStatusFilterDropdown: async () => {
      await clickFilterByIndex(0); // Status filter is the first filter button
    },
    setSearchInputValue: async (searchValue: string) => {
      await act(async () => {
        find('searchBarContainer')
          .find('input')
          .simulate('keyup', { target: { value: searchValue } });
      });

      component.update();
    },
    clickFilterByTitle: async (title: string) => {
      // We need to read the document "body" as the filter dropdown (an EuiSelectable)
      // is added in a portalled popover and not inside the component DOM tree.
      const filterButton: HTMLButtonElement | null = document.body.querySelector(
        `.euiSelectableListItem[title=${title}]`
      );

      expect(filterButton).not.toBeNull();

      await act(async () => {
        filterButton!.click();
      });

      component.update();
    },
  };

  const pagination = {
    clickPaginationAt: async (index: number) => {
      await act(async () => {
        find(`pagination-button-${index}`).simulate('click');
      });

      component.update();
    },
    clickRowsPerPageDropdown: async () => {
      await act(async () => {
        find('tablePaginationPopoverButton').simulate('click');
      });

      component.update();
    },
  };

  const mlDeprecationFlyout = {
    clickUpgradeSnapshot: async () => {
      await act(async () => {
        find('mlSnapshotDetails.upgradeSnapshotButton').simulate('click');
      });

      component.update();
    },
    clickDeleteSnapshot: async () => {
      await act(async () => {
        find('mlSnapshotDetails.deleteSnapshotButton').simulate('click');
      });

      component.update();
    },
  };

  const indexSettingsDeprecationFlyout = {
    clickDeleteSettingsButton: async () => {
      await act(async () => {
        find('deleteSettingsButton').simulate('click');
      });

      component.update();
    },
  };

  const clusterSettingsDeprecationFlyout = {
    clickDeleteSettingsButton: async () => {
      await act(async () => {
        find('deleteClusterSettingsButton').simulate('click');
      });

      component.update();
    },
  };

  const reindexDeprecationFlyout = {
    clickReindexButton: async () => {
      await act(async () => {
        find('startReindexingButton').simulate('click');
      });

      component.update();
    },
    closeFlyout: async () => {
      await act(async () => {
        find('closeReindexButton').simulate('click');
      });
      component.update();
    },
  };

  return {
    table,
    searchBar,
    pagination,
    mlDeprecationFlyout,
    reindexDeprecationFlyout,
    indexSettingsDeprecationFlyout,
    clusterSettingsDeprecationFlyout,
  };
};

export const setupElasticsearchPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<ElasticsearchTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(EsDeprecations, httpSetup, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
