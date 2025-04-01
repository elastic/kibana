/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/indices?includeHiddenIndices=true`],
    componentRoutePath: `/:section(indices|data_streams)`,
  },
  doMountAsync: true,
};

export interface IndicesTestBed extends TestBed<TestSubjects> {
  actions: {
    clickIndexNameAt: (index: number) => Promise<void>;
    findIndexDetailsPageTitle: () => string;
    selectIndexDetailsTab: (
      tab: 'settings' | 'mappings' | 'stats' | 'edit_settings'
    ) => Promise<void>;
    getIncludeHiddenIndicesToggleStatus: () => boolean;
    clickIncludeHiddenIndicesToggle: () => void;
    clickDataStreamAt: (index: number) => Promise<void>;
    dataStreamLinkExistsAt: (index: number) => boolean;
    clickManageContextMenuButton: () => Promise<void>;
    clickContextMenuOption: (optionDataTestSubject: string) => Promise<void>;
    clickModalConfirm: () => Promise<void>;
    clickCreateIndexButton: () => Promise<void>;
    clickCreateIndexCancelButton: () => Promise<void>;
    clickCreateIndexSaveButton: () => Promise<void>;
    selectIndexMode: (indexModeTestSubj: string) => Promise<void>;
  };
  findDataStreamDetailPanel: () => ReactWrapper;
  findDataStreamDetailPanelTitle: () => string;
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<IndicesTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  /**
   * User Actions
   */
  const clickContextMenuOption = async (optionDataTestSubject: string) => {
    const { find, component } = testBed;

    await act(async () => {
      find(`indexContextMenu.${optionDataTestSubject}`).simulate('click');
    });
    component.update();
  };

  const clickIncludeHiddenIndicesToggle = () => {
    const { find } = testBed;
    find('checkboxToggles-includeHiddenIndices').simulate('click');
  };

  const clickManageContextMenuButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('indexActionsContextMenuButton').simulate('click');
    });
    component.update();
  };

  const getIncludeHiddenIndicesToggleStatus = () => {
    const { find } = testBed;
    const props = find('checkboxToggles-includeHiddenIndices').props();
    return Boolean(props['aria-checked']);
  };

  const findIndexDetailsPageTitle = () => {
    const { find } = testBed;
    return find('indexDetailsHeader').text();
  };

  const selectIndexDetailsTab = async (
    tab: 'settings' | 'mappings' | 'stats' | 'edit_settings'
  ) => {
    const indexDetailsTabs = ['settings', 'mappings', 'stats', 'edit_settings'];
    const { find, component } = testBed;
    await act(async () => {
      find('detailPanelTab').at(indexDetailsTabs.indexOf(tab)).simulate('click');
    });
    component.update();
  };

  const clickIndexNameAt = async (index: number) => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('indexTable');
    const indexNameLink = findTestSubject(rows[index].reactWrapper, 'indexTableIndexNameLink');

    await act(async () => {
      indexNameLink.simulate('click');
    });

    component.update();
  };

  const clickDataStreamAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('indexTable');
    const dataStreamLink = findTestSubject(rows[index].reactWrapper, 'dataStreamLink');

    await act(async () => {
      router.navigateTo(dataStreamLink.props().href!);
    });

    component.update();
  };

  const dataStreamLinkExistsAt = (index: number) => {
    const { table } = testBed;
    const { rows } = table.getMetaData('indexTable');
    return findTestSubject(rows[index].reactWrapper, 'dataStreamLink').exists();
  };

  const clickModalConfirm = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('confirmModalConfirmButton').simulate('click');
    });
    component.update();
  };

  const findDataStreamDetailPanel = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanel');
  };

  const findDataStreamDetailPanelTitle = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanelTitle').text();
  };

  const clickCreateIndexButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('createIndexButton').simulate('click');
    });
    component.update();
  };

  const clickCreateIndexCancelButton = async () => {
    const { find, exists, component } = testBed;

    expect(exists('createIndexCancelButton')).toBe(true);
    await act(async () => {
      find('createIndexCancelButton').simulate('click');
    });
    component.update();
  };

  const clickCreateIndexSaveButton = async () => {
    const { find, exists, component } = testBed;

    expect(exists('createIndexSaveButton')).toBe(true);
    await act(async () => {
      find('createIndexSaveButton').simulate('click');
    });
    component.update();
  };

  const selectIndexMode = async (indexModeTestSubj: string) => {
    const { find, exists, component } = testBed;

    await act(async () => {
      find('indexModeField').simulate('click');
    });
    component.update();

    expect(exists(indexModeTestSubj)).toBe(true);
    await act(async () => {
      find(indexModeTestSubj).simulate('click');
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      clickIndexNameAt,
      findIndexDetailsPageTitle,
      selectIndexDetailsTab,
      getIncludeHiddenIndicesToggleStatus,
      clickIncludeHiddenIndicesToggle,
      clickDataStreamAt,
      dataStreamLinkExistsAt,
      clickManageContextMenuButton,
      clickContextMenuOption,
      clickModalConfirm,
      clickCreateIndexButton,
      clickCreateIndexCancelButton,
      clickCreateIndexSaveButton,
      selectIndexMode,
    },
    findDataStreamDetailPanel,
    findDataStreamDetailPanelTitle,
  };
};
