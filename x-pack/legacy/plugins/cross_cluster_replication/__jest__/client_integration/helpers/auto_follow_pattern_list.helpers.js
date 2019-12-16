/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, findTestSubject } from '../../../../../../test_utils';
import { AutoFollowPatternList } from '../../../public/app/sections/home/auto_follow_pattern_list';
import { ccrStore } from '../../../public/app/store';
import routing from '../../../public/app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: router => (routing.reactRouter = router),
  },
};

const initTestBed = registerTestBed(AutoFollowPatternList, testBedConfig);

export const setup = props => {
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

  const clickBulkDeleteButton = () => {
    testBed.find('bulkDeleteButton').simulate('click');
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

  return {
    ...testBed,
    actions: {
      selectAutoFollowPatternAt,
      clickBulkDeleteButton,
      clickConfirmModalDeleteAutoFollowPattern,
      clickRowActionButtonAt,
      clickAutoFollowPatternAt,
    },
  };
};
