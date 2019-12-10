/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { updateFields, updateFormErrors } from './follower_index_form';

jest.mock('ui/new_platform');
jest.mock('ui/indices', () => ({
  INDEX_ILLEGAL_CHARACTERS_VISIBLE: [],
}));

describe('<FollowerIndexForm /> state transitions', () => {
  it('updateFormErrors() should merge errors with existing fieldsErrors', () => {
    const errors = { name: 'Some error' };
    const state = {
      fieldsErrors: { leaderIndex: null }
    };
    const output = updateFormErrors(errors)(state);
    expect(output).toMatchSnapshot();
  });

  it('updateFields() should merge new fields value with existing followerIndex', () => {
    const fields = { name: 'new-name' };
    const state = {
      followerIndex: { name: 'foo', leaderIndex: 'bar' }
    };
    const output = updateFields(fields)(state);
    expect(output).toMatchSnapshot();
  });
});
