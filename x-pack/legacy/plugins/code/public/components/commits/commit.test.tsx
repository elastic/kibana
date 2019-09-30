/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';

import { Commit } from './commit';
import { CommitInfo } from '../../../model/commit';

describe('Commit component', () => {
  test('renders correctly for a commit', () => {
    const commitInfo: CommitInfo = {
      updated: new Date(Date.UTC(2222, 10, 11)),
      message: 'This is my commit message\n\nThis is the description',
      author: 'author',
      committer: 'committer',
      id: '4ba67b8',
      parents: ['9817575'],
      treeId: '96440ceb55e04a99d33c1c8ee021400a680fbf74',
    };
    const wrapper = mount(
      <Commit
        showRepoLink={false}
        commit={commitInfo}
        date="11/11/2222"
        repoUri="github.com/elastic/code"
      />
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
