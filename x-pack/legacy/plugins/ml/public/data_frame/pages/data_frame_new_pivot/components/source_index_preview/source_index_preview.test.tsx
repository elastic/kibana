/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { AngularContext } from '../../../../../contexts/angular';

import { getPivotQuery } from '../../../../common';

import { SourceIndexPreview } from './source_index_preview';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <SourceIndexPreview />', () => {
  test('Minimal initialization', () => {
    const currentIndexPattern = {
      id: 'the-index-pattern-id',
      title: 'the-index-pattern-title',
      fields: [],
    };

    const props = {
      query: getPivotQuery('the-query'),
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <AngularContext.Provider
          value={{
            combinedQuery: {},
            currentIndexPattern,
            currentSavedSearch: {},
            indexPatterns: {},
            kbnBaseUrl: 'url',
            kibanaConfig: {},
          }}
        >
          <SourceIndexPreview {...props} />
        </AngularContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
