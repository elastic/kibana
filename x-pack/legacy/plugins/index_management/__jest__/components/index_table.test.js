/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { MemoryRouter } from 'react-router-dom';
import { AppWithoutRouter } from '../../public/app/app';
import { Provider } from 'react-redux';
import { loadIndicesSuccess } from '../../public/app/store/actions';
import { breadcrumbService } from '../../public/app/services/breadcrumbs';
import { uiMetricService } from '../../public/app/services/ui_metric';
import { notificationService } from '../../public/app/services/notification';
import { httpService } from '../../public/app/services/http';
import { createUiStatsReporter } from '../../../../../../src/legacy/core_plugins/ui_metric/public';
import { indexManagementStore } from '../../public/app/store';
import { BASE_PATH, API_BASE_PATH } from '../../common/constants';
import { mountWithIntl } from '../../../../../test_utils/enzyme_helpers';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { notificationServiceMock } from '../../../../../../src/core/public/notifications/notifications_service.mock';
import { chromeServiceMock } from '../../../../../../src/core/public/chrome/chrome_service.mock';

jest.mock('ui/new_platform');

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

let server = null;

let store = null;
const indices = [];
for (let i = 0; i < 105; i++) {
  const baseFake = {
    health: i % 2 === 0 ? 'green' : 'yellow',
    status: i % 2 === 0 ? 'open' : 'closed',
    primary: 1,
    replica: 1,
    documents: 10000,
    documents_deleted: 100,
    size: '156kb',
    primary_size: '156kb',
  };
  indices.push({
    ...baseFake,
    name: `testy${i}`,
  });
  indices.push({
    ...baseFake,
    name: `.admin${i}`,
  });
}
let component = null;

const status = (rendered, row = 0) => {
  rendered.update();
  return findTestSubject(rendered, 'indexTableCell-status')
    .at(row)
    .find('.euiTableCellContent')
    .text();
};

const snapshot = rendered => {
  expect(rendered).toMatchSnapshot();
};
const openMenuAndClickButton = (rendered, rowIndex, buttonIndex) => {
  const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
  checkboxes.at(rowIndex).simulate('change', { target: { checked: true } });
  rendered.update();
  const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
  actionButton.simulate('click');
  rendered.update();
  const contextMenuButtons = findTestSubject(rendered, 'indexTableContextMenuButton');
  contextMenuButtons.at(buttonIndex).simulate('click');
};
const testEditor = (buttonIndex, rowIndex = 0) => {
  const rendered = mountWithIntl(component);
  openMenuAndClickButton(rendered, rowIndex, buttonIndex);
  rendered.update();
  snapshot(findTestSubject(rendered, 'detailPanelTabSelected').text());
};
const testAction = (buttonIndex, done, rowIndex = 0) => {
  const rendered = mountWithIntl(component);
  let count = 0;
  store.subscribe(() => {
    if (count > 1) {
      snapshot(status(rendered, rowIndex));
      done();
    }
    count++;
  });
  expect.assertions(2);
  openMenuAndClickButton(rendered, rowIndex, buttonIndex);
  snapshot(status(rendered, rowIndex));
};
const names = rendered => {
  return findTestSubject(rendered, 'indexTableIndexNameLink');
};
const namesText = rendered => {
  return names(rendered).map(button => button.text());
};

describe('index table', () => {
  beforeEach(() => {
    // Mock initialization of services
    // @ts-ignore
    httpService.init(mockHttpClient);
    breadcrumbService.init(chromeServiceMock.createStartContract(), '');
    uiMetricService.init(createUiStatsReporter);
    notificationService.init(notificationServiceMock.createStartContract());

    store = indexManagementStore();
    component = (
      <Provider store={store}>
        <MemoryRouter initialEntries={[`${BASE_PATH}indices`]}>
          <AppWithoutRouter />
        </MemoryRouter>
      </Provider>
    );
    store.dispatch(loadIndicesSuccess({ indices }));
    server = sinon.fakeServer.create();
    server.respondWith(`${API_BASE_PATH}/indices`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(indices),
    ]);
    server.respondWith([
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ acknowledged: true }),
    ]);
    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(indices),
    ]);
    server.respondImmediately = true;
  });
  afterEach(() => {
    server.restore();
  });

  test('should change pages when a pagination link is clicked on', () => {
    const rendered = mountWithIntl(component);
    snapshot(namesText(rendered));
    const pagingButtons = rendered.find('.euiPaginationButton');
    pagingButtons.at(2).simulate('click');
    rendered.update();
    snapshot(namesText(rendered));
  });
  test('should show more when per page value is increased', () => {
    const rendered = mountWithIntl(component);
    const perPageButton = rendered.find('EuiTablePagination EuiPopover').find('button');
    perPageButton.simulate('click');
    rendered.update();
    const fiftyButton = rendered.find('.euiContextMenuItem').at(1);
    fiftyButton.simulate('click');
    rendered.update();
    expect(namesText(rendered).length).toBe(50);
  });
  test('should show the Actions menu button only when at least one row is selected', () => {
    const rendered = mountWithIntl(component);
    let button = findTestSubject(rendered, 'indexTableContextMenuButton');
    expect(button.length).toEqual(0);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    rendered.update();
    button = findTestSubject(rendered, 'indexActionsContextMenuButton');
    expect(button.length).toEqual(1);
  });
  test('should show system indices only when the switch is turned on', () => {
    const rendered = mountWithIntl(component);
    snapshot(
      rendered
        .find('.euiPagination .euiPaginationButton .euiButtonEmpty__content > span')
        .map(span => span.text())
    );
    const switchControl = rendered.find('.euiSwitch__button');
    switchControl.simulate('click');
    snapshot(
      rendered
        .find('.euiPagination .euiPaginationButton .euiButtonEmpty__content > span')
        .map(span => span.text())
    );
  });
  test('should filter based on content of search input', () => {
    const rendered = mountWithIntl(component);
    const searchInput = rendered.find('.euiFieldSearch').first();
    searchInput.instance().value = 'testy0';
    searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
    rendered.update();
    snapshot(namesText(rendered));
  });
  test('should sort when header is clicked', () => {
    const rendered = mountWithIntl(component);
    const nameHeader = findTestSubject(rendered, 'indexTableHeaderCell-name').find('button');
    nameHeader.simulate('click');
    rendered.update();
    snapshot(namesText(rendered));
    nameHeader.simulate('click');
    rendered.update();
    snapshot(namesText(rendered));
  });
  test('should open the index detail slideout when the index name is clicked', () => {
    const rendered = mountWithIntl(component);
    expect(findTestSubject(rendered, 'indexDetailFlyout').length).toBe(0);
    const indexNameLink = names(rendered).at(0);
    indexNameLink.simulate('click');
    rendered.update();
    expect(findTestSubject(rendered, 'indexDetailFlyout').length).toBe(1);
  });
  test('should show the right context menu options when one index is selected and open', () => {
    const rendered = mountWithIntl(component);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map(span => span.text()));
  });
  test('should show the right context menu options when one index is selected and closed', () => {
    const rendered = mountWithIntl(component);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map(span => span.text()));
  });
  test('should show the right context menu options when one open and one closed index is selected', () => {
    const rendered = mountWithIntl(component);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map(span => span.text()));
  });
  test('should show the right context menu options when more than one open index is selected', () => {
    const rendered = mountWithIntl(component);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    checkboxes.at(2).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map(span => span.text()));
  });
  test('should show the right context menu options when more than one closed index is selected', () => {
    const rendered = mountWithIntl(component);
    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    checkboxes.at(3).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map(span => span.text()));
  });
  test('flush button works from context menu', done => {
    testAction(8, done);
  });
  test('clear cache button works from context menu', done => {
    testAction(7, done);
  });
  test('refresh button works from context menu', done => {
    testAction(6, done);
  });
  test('force merge button works from context menu', done => {
    const rendered = mountWithIntl(component);
    const rowIndex = 0;
    openMenuAndClickButton(rendered, rowIndex, 5);
    snapshot(status(rendered, rowIndex));
    expect(rendered.find('.euiModal').length).toBe(1);
    let count = 0;
    store.subscribe(() => {
      if (count > 1) {
        snapshot(status(rendered, rowIndex));
        expect(rendered.find('.euiModal').length).toBe(0);
        done();
      }
      count++;
    });
    const confirmButton = findTestSubject(rendered, 'confirmModalConfirmButton');
    confirmButton.simulate('click');
    snapshot(status(rendered, rowIndex));
  });
  test('close index button works from context menu', done => {
    const modifiedIndices = indices.map(index => {
      return {
        ...index,
        status: index.name === 'testy0' ? 'close' : index.status,
      };
    });

    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(modifiedIndices),
    ]);
    testAction(4, done);
  });
  test('open index button works from context menu', done => {
    const modifiedIndices = indices.map(index => {
      return {
        ...index,
        status: index.name === 'testy1' ? 'open' : index.status,
      };
    });
    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(modifiedIndices),
    ]);
    testAction(3, done, 1);
  });
  test('show settings button works from context menu', () => {
    testEditor(0);
  });
  test('show mapping button works from context menu', () => {
    testEditor(1);
  });
  test('show stats button works from context menu', () => {
    testEditor(2);
  });
  test('edit index button works from context menu', () => {
    testEditor(3);
  });
});
