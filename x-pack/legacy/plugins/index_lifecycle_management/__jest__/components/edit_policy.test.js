/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment-timezone';
import { Provider } from 'react-redux';
import { fetchedPolicies, fetchedNodes } from '../../public/store/actions';
import { indexLifecycleManagementStore } from '../../public/store';
import { mountWithIntl } from '../../../../../test_utils/enzyme_helpers';
import { EditPolicy } from '../../public/sections/edit_policy';
// axios has a $http like interface so using it to simulate $http
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { setHttpClient } from '../../public/services/api';
setHttpClient(axios.create({ adapter: axiosXhrAdapter }));
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  positiveNumbersAboveZeroErrorMessage,
  numberRequiredMessage,
  positiveNumberRequiredMessage,
  maximumAgeRequiredMessage,
  maximumSizeRequiredMessage,
  policyNameRequiredMessage,
  policyNameStartsWithUnderscoreErrorMessage,
  policyNameContainsCommaErrorMessage,
  policyNameContainsSpaceErrorMessage,
  policyNameMustBeDifferentErrorMessage,
  policyNameAlreadyUsedErrorMessage,
  maximumDocumentsRequiredMessage,
} from '../../public/store/selectors/lifecycle';

jest.mock('ui/new_platform');

let server;
let store;
const policy = {
  phases: {
    hot: {
      min_age: '0s',
      actions: {
        rollover: {
          max_size: '1gb',
        },
      },
    },
  },
};
const policies = [];
for (let i = 0; i < 105; i++) {
  policies.push({
    version: i,
    modified_date: moment()
      .subtract(i, 'days')
      .valueOf(),
    linkedIndices: i % 2 === 0 ? [`index${i}`] : null,
    name: `testy${i}`,
    policy: {
      ...policy,
    },
  });
}
window.scrollTo = jest.fn();
window.TextEncoder = null;
let component;
const activatePhase = (rendered, phase) => {
  const testSubject = `enablePhaseSwitch-${phase}`;
  findTestSubject(rendered, testSubject).simulate('click');
  rendered.update();
};
const expectedErrorMessages = (rendered, expectedErrorMessages) => {
  const errorMessages = rendered.find('.euiFormErrorText');
  expect(errorMessages.length).toBe(expectedErrorMessages.length);
  expectedErrorMessages.forEach(expectedErrorMessage => {
    let foundErrorMessage;
    for (let i = 0; i < errorMessages.length; i++) {
      if (errorMessages.at(i).text() === expectedErrorMessage) {
        foundErrorMessage = true;
      }
    }
    expect(foundErrorMessage).toBe(true);
  });
};
const noRollover = rendered => {
  findTestSubject(rendered, 'rolloverSwitch').simulate('click');
  rendered.update();
};
const getNodeAttributeSelect = (rendered, phase) => {
  return rendered.find(`select#${phase}-selectedNodeAttrs`);
};
const setPolicyName = (rendered, policyName) => {
  const policyNameField = findTestSubject(rendered, 'policyNameField');
  policyNameField.simulate('change', { target: { value: policyName } });
  rendered.update();
};
const setPhaseAfter = (rendered, phase, after) => {
  const afterInput = rendered.find(`input#${phase}-selectedMinimumAge`);
  afterInput.simulate('change', { target: { value: after } });
  rendered.update();
};
const setPhaseIndexPriority = (rendered, phase, priority) => {
  const priorityInput = rendered.find(`input#${phase}-phaseIndexPriority`);
  priorityInput.simulate('change', { target: { value: priority } });
  rendered.update();
};
const save = rendered => {
  const saveButton = findTestSubject(rendered, 'savePolicyButton');
  saveButton.simulate('click');
  rendered.update();
};
describe('edit policy', () => {
  beforeEach(() => {
    store = indexLifecycleManagementStore();
    component = (
      <Provider store={store}>
        <EditPolicy />
      </Provider>
    );
    store.dispatch(fetchedPolicies(policies));
    server = sinon.fakeServer.create();
    server.respondWith('/api/index_lifecycle_management/policies', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(policies),
    ]);
  });
  describe('top level form', () => {
    test('should show error when trying to save empty form', () => {
      const rendered = mountWithIntl(component);
      save(rendered);
      expectedErrorMessages(rendered, [policyNameRequiredMessage]);
    });
    test('should show error when trying to save policy name with space', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'my policy');
      save(rendered);
      expectedErrorMessages(rendered, [policyNameContainsSpaceErrorMessage]);
    });
    test('should show error when trying to save policy name that is already used', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'testy0');
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [policyNameAlreadyUsedErrorMessage]);
    });
    test('should show error when trying to save as new policy but using the same name', () => {
      component = (
        <Provider store={store}>
          <EditPolicy match={{ params: { policyName: 'testy0' } }} />
        </Provider>
      );
      const rendered = mountWithIntl(component);
      findTestSubject(rendered, 'saveAsNewSwitch').simulate('click');
      rendered.update();
      setPolicyName(rendered, 'testy0');
      save(rendered);
      expectedErrorMessages(rendered, [policyNameMustBeDifferentErrorMessage]);
    });
    test('should show error when trying to save policy name with comma', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'my,policy');
      save(rendered);
      expectedErrorMessages(rendered, [policyNameContainsCommaErrorMessage]);
    });
    test('should show error when trying to save policy name starting with underscore', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, '_mypolicy');
      save(rendered);
      expectedErrorMessages(rendered, [policyNameStartsWithUnderscoreErrorMessage]);
    });
  });
  describe('hot phase', () => {
    test('should show errors when trying to save with no max size and no max age', () => {
      const rendered = mountWithIntl(component);
      setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = rendered.find(`input#hot-selectedMaxSizeStored`);
      maxSizeInput.simulate('change', { target: { value: '' } });
      const maxAgeInput = rendered.find(`input#hot-selectedMaxAge`);
      maxAgeInput.simulate('change', { target: { value: '' } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [
        maximumSizeRequiredMessage,
        maximumAgeRequiredMessage,
        maximumDocumentsRequiredMessage,
      ]);
    });
    test('should show number above 0 required error when trying to save with -1 for max size', () => {
      const rendered = mountWithIntl(component);
      setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = rendered.find(`input#hot-selectedMaxSizeStored`);
      maxSizeInput.simulate('change', { target: { value: -1 } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show number above 0 required error when trying to save with 0 for max size', () => {
      const rendered = mountWithIntl(component);
      setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = rendered.find(`input#hot-selectedMaxSizeStored`);
      maxSizeInput.simulate('change', { target: { value: 0 } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show number above 0 required error when trying to save with -1 for max age', () => {
      const rendered = mountWithIntl(component);
      setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = rendered.find(`input#hot-selectedMaxAge`);
      maxSizeInput.simulate('change', { target: { value: -1 } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show number above 0 required error when trying to save with 0 for max age', () => {
      const rendered = mountWithIntl(component);
      setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = rendered.find(`input#hot-selectedMaxAge`);
      maxSizeInput.simulate('change', { target: { value: 0 } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number required error when trying to save with -1 for index priority', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      setPhaseIndexPriority(rendered, 'hot', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
  });
  describe('warm phase', () => {
    test('should show number required error when trying to save empty warm phase', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      save(rendered);
      expectedErrorMessages(rendered, [numberRequiredMessage]);
    });
    test('should show positive number required above zero error when trying to save warm phase with 0 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', 0);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number required error when trying to save warm phase with -1 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
    test('should show positive number required error when trying to save warm phase with -1 for index priority', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', 1);
      setPhaseIndexPriority(rendered, 'warm', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
    test('should show positive number required above zero error when trying to save warm phase with 0 for shrink', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      findTestSubject(rendered, 'shrinkSwitch').simulate('click');
      rendered.update();
      setPhaseAfter(rendered, 'warm', 1);
      const shrinkInput = rendered.find('input#warm-selectedPrimaryShardCount');
      shrinkInput.simulate('change', { target: { value: '0' } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number above 0 required error when trying to save warm phase with -1 for shrink', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', 1);
      findTestSubject(rendered, 'shrinkSwitch').simulate('click');
      rendered.update();
      const shrinkInput = rendered.find('input#warm-selectedPrimaryShardCount');
      shrinkInput.simulate('change', { target: { value: '-1' } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number required above zero error when trying to save warm phase with 0 for force merge', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', 1);
      findTestSubject(rendered, 'forceMergeSwitch').simulate('click');
      rendered.update();
      const shrinkInput = rendered.find('input#warm-selectedForceMergeSegments');
      shrinkInput.simulate('change', { target: { value: '0' } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number above 0 required error when trying to save warm phase with -1 for force merge', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      setPhaseAfter(rendered, 'warm', 1);
      findTestSubject(rendered, 'forceMergeSwitch').simulate('click');
      rendered.update();
      const shrinkInput = rendered.find('input#warm-selectedForceMergeSegments');
      shrinkInput.simulate('change', { target: { value: '-1' } });
      rendered.update();
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show spinner for node attributes input when loading', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(getNodeAttributeSelect(rendered, 'warm').exists()).toBeFalsy();
    });
    test('should show warning instead of node attributes input when none exist', () => {
      store.dispatch(fetchedNodes({}));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeTruthy();
      expect(getNodeAttributeSelect(rendered, 'warm').exists()).toBeFalsy();
    });
    test('should show node attributes input when attributes exist', () => {
      store.dispatch(fetchedNodes({ 'attribute:true': ['node1'] }));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'warm');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
    });
    test('should show view node attributes link when attribute selected and show flyout when clicked', () => {
      store.dispatch(fetchedNodes({ 'attribute:true': ['node1'] }));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'warm');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'warm-viewNodeDetailsFlyoutButton').exists()).toBeFalsy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
      nodeAttributesSelect.simulate('change', { target: { value: 'attribute:true' } });
      rendered.update();
      const flyoutButton = findTestSubject(rendered, 'warm-viewNodeDetailsFlyoutButton');
      expect(flyoutButton.exists()).toBeTruthy();
      flyoutButton.simulate('click');
      rendered.update();
      expect(rendered.find('.euiFlyout').exists()).toBeTruthy();
    });
  });
  describe('cold phase', () => {
    test('should show positive number required error when trying to save cold phase with 0 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      setPhaseAfter(rendered, 'cold', 0);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number required error when trying to save cold phase with -1 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      setPhaseAfter(rendered, 'cold', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
    test('should show spinner for node attributes input when loading', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(getNodeAttributeSelect(rendered, 'cold').exists()).toBeFalsy();
    });
    test('should show warning instead of node attributes input when none exist', () => {
      store.dispatch(fetchedNodes({}));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeTruthy();
      expect(getNodeAttributeSelect(rendered, 'cold').exists()).toBeFalsy();
    });
    test('should show node attributes input when attributes exist', () => {
      store.dispatch(fetchedNodes({ 'attribute:true': ['node1'] }));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'cold');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
    });
    test('should show view node attributes link when attribute selected and show flyout when clicked', () => {
      store.dispatch(fetchedNodes({ 'attribute:true': ['node1'] }));
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'cold');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'cold-viewNodeDetailsFlyoutButton').exists()).toBeFalsy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
      nodeAttributesSelect.simulate('change', { target: { value: 'attribute:true' } });
      rendered.update();
      const flyoutButton = findTestSubject(rendered, 'cold-viewNodeDetailsFlyoutButton');
      expect(flyoutButton.exists()).toBeTruthy();
      flyoutButton.simulate('click');
      rendered.update();
      expect(rendered.find('.euiFlyout').exists()).toBeTruthy();
    });
    test('should show positive number required error when trying to save with -1 for index priority', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'cold');
      setPhaseAfter(rendered, 'cold', 1);
      setPhaseIndexPriority(rendered, 'cold', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
  });
  describe('delete phase', () => {
    test('should show positive number required error when trying to save delete phase with 0 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'delete');
      setPhaseAfter(rendered, 'delete', 0);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
    });
    test('should show positive number required error when trying to save delete phase with -1 for after', () => {
      const rendered = mountWithIntl(component);
      noRollover(rendered);
      setPolicyName(rendered, 'mypolicy');
      activatePhase(rendered, 'delete');
      setPhaseAfter(rendered, 'delete', -1);
      save(rendered);
      expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
    });
  });
});
