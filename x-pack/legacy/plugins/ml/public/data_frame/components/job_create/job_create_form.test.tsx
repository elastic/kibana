/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { KibanaContext } from '../../common';

import { JobCreateForm } from './job_create_form';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <JobCreateForm />', () => {
  test('Minimal initialization', () => {
    const props = {
      createIndexPattern: false,
      jobId: 'the-job-id',
      jobConfig: {},
      overrides: { created: false, started: false, indexPatternId: undefined },
      onChange() {},
    };

    const currentIndexPattern = {
      id: 'the-index-pattern-id',
      title: 'the-index-pattern-title',
      fields: [],
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <KibanaContext.Provider
          value={{
            combinedQuery: {},
            currentIndexPattern,
            currentSavedSearch: {},
            indexPatterns: {},
            kbnBaseUrl: 'url',
            kibanaConfig: {},
          }}
        >
          <JobCreateForm {...props} />
        </KibanaContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
