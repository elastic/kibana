/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';

import { Commit } from './commit';

describe('Commit component', () => {
  test('renders correctly for a commit', () => {
    const message = 'This is my commit message\n\nThis is the description';

    const wrapper = mount(
      <Commit
        commitId="4ba67b8"
        message={message}
        committer="committer"
        date="11/11/2222"
        repoUri="github.com/elastic/code"
        showRepoLink={false}
      />
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
