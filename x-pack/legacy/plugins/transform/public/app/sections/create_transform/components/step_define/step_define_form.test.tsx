/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { KibanaContext } from '../../../../lib/kibana';

import {
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';
import { StepDefineForm, isAggNameConflict } from './step_define_form';

jest.mock('ui/new_platform');

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Transform: <DefinePivotForm />', () => {
  test('Minimal initialization', () => {
    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <KibanaContext.Provider value={{ initialized: false }}>
          <StepDefineForm onChange={() => {}} />
        </KibanaContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});

describe('Transform: isAggNameConflict()', () => {
  test('detect aggregation name conflicts', () => {
    const aggList: PivotAggsConfigDict = {
      'the-agg-name': {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-field-name',
        aggName: 'the-agg-name',
        dropDownName: 'the-dropdown-name',
      },
      'the-namespaced-agg-name.namespace': {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-field-name',
        aggName: 'the-namespaced-agg-name.namespace',
        dropDownName: 'the-dropdown-name',
      },
    };

    const groupByList: PivotGroupByConfigDict = {
      'the-group-by-agg-name': {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-field-name',
        aggName: 'the-group-by-agg-name',
        dropDownName: 'the-dropdown-name',
      },
      'the-namespaced-group-by-agg-name.namespace': {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-field-name',
        aggName: 'the-namespaced-group-by-agg-name.namespace',
        dropDownName: 'the-dropdown-name',
      },
    };

    // no conflict, completely different name, no namespacing involved
    expect(isAggNameConflict('the-other-agg-name', aggList, groupByList)).toBe(false);
    // no conflict, completely different name and no conflicting namespace
    expect(isAggNameConflict('the-other-agg-name.namespace', aggList, groupByList)).toBe(false);

    // exact match conflict on aggregation name
    expect(isAggNameConflict('the-agg-name', aggList, groupByList)).toBe(true);
    // namespace conflict with `the-agg-name` aggregation
    expect(isAggNameConflict('the-agg-name.namespace', aggList, groupByList)).toBe(true);

    // exact match conflict on group-by name
    expect(isAggNameConflict('the-group-by-agg-name', aggList, groupByList)).toBe(true);
    // namespace conflict with `the-group-by-agg-name` group-by
    expect(isAggNameConflict('the-group-by-agg-name.namespace', aggList, groupByList)).toBe(true);

    // exact match conflict on namespaced agg name
    expect(isAggNameConflict('the-namespaced-agg-name.namespace', aggList, groupByList)).toBe(true);
    // no conflict, same base agg name but different namespace
    expect(isAggNameConflict('the-namespaced-agg-name.namespace2', aggList, groupByList)).toBe(
      false
    );
    // namespace conflict because the new agg name is base name of existing nested field
    expect(isAggNameConflict('the-namespaced-agg-name', aggList, groupByList)).toBe(true);

    // exact match conflict on namespaced group-by name
    expect(
      isAggNameConflict('the-namespaced-group-by-agg-name.namespace', aggList, groupByList)
    ).toBe(true);
    // no conflict, same base group-by name but different namespace
    expect(
      isAggNameConflict('the-namespaced-group-by-agg-name.namespace2', aggList, groupByList)
    ).toBe(false);
    // namespace conflict because the new group-by name is base name of existing nested field
    expect(isAggNameConflict('the-namespaced-group-by-agg-name', aggList, groupByList)).toBe(true);
  });
});
