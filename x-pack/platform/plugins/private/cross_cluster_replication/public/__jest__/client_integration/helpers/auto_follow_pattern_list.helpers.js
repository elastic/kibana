/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, findTestSubject } from '@kbn/test-jest-helpers';
import { AutoFollowPatternList } from '../../../app/sections/home/auto_follow_pattern_list';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) =>
      (routing.reactRouter = {
        ...router,
        history: {
          ...router.history,
          parentHistory: {
            createHref: () => '',
            push: () => {},
          },
        },
        getUrlForApp: () => '',
      }),
  },
};

const initTestBed = registerTestBed(AutoFollowPatternList, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);
  const EUI_TABLE = 'autoFollowPatternListTable';

  /**
   * User Actions
   */

  const selectAutoFollowPatternAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const getPatternsActionMenuItem = (index = 0) => {
    testBed.find('autoFollowPatternActionMenuButton').simulate('click');
    const contextMenu = testBed.find('autoFollowPatternActionContextMenu');
    return contextMenu.find('button').at(index);
  };

  const clickPatternsActionMenuItem = (index = 0) => {
    getPatternsActionMenuItem(index).simulate('click');
  };

  const getPatternsActionMenuItemText = (index = 0) => {
    return getPatternsActionMenuItem(index).text();
  };

  const clickBulkDeleteButton = () => {
    clickPatternsActionMenuItem(1);
  };

  const clickConfirmModalDeleteAutoFollowPattern = () => {
    const modal = testBed.find('deleteAutoFollowPatternConfirmation');
    findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
  };

  const clickRowActionButtonAt = (index = 0, action = 'delete') => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const indexLastColumn = rows[index].columns.length - 1;
    const tableCellActions = rows[index].columns[indexLastColumn].reactWrapper;

    let button;
    if (action === 'delete') {
      button = findTestSubject(tableCellActions, 'deleteButton');
    } else if (action === 'edit') {
      button = findTestSubject(tableCellActions, 'editButton');
    }

    if (!button) {
      throw new Error(`Button for action "${action}" not found.`);
    }

    button.simulate('click');
  };

  const clickAutoFollowPatternAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const autoFollowPatternLink = findTestSubject(
      rows[index].reactWrapper,
      'autoFollowPatternLink'
    );
    autoFollowPatternLink.simulate('click');
  };

  const clickPaginationNextButton = () => {
    testBed.find('autoFollowPatternListTable.pagination-button-next').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectAutoFollowPatternAt,
      clickBulkDeleteButton,
      clickConfirmModalDeleteAutoFollowPattern,
      clickRowActionButtonAt,
      clickAutoFollowPatternAt,
      getPatternsActionMenuItemText,
      clickPatternsActionMenuItem,
      clickPaginationNextButton,
    },
  };
};
