/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { QueryLanguageSwitcher } from 'ui/query_bar/components/language_switcher';

const mockChromeFactory = jest.fn(() => {
  return {
    getBasePath: () => `foo`,
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'history:limit':
              return 10;
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        },
      };
    },
  };
});

const mockPersistedLogFactory = jest.fn(() => {
  return {
    add: jest.fn(),
    get: jest.fn(),
  };
});

jest.mock('ui/chrome', () => mockChromeFactory());
jest.mock('../../chrome', () => mockChromeFactory());
jest.mock('ui/persisted_log', () => ({
  PersistedLog: mockPersistedLogFactory,
}));

jest.mock('../../metadata', () => ({
  metadata: {
    branch: 'foo',
  },
}));

import { shallow } from 'enzyme';
import React from 'react';
import { QueryBar } from 'ui/query_bar';

const noop = () => {
  return;
};

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const luceneQuery = {
  query: 'response:200',
  language: 'lucene',
};

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  store: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

const mockIndexPattern = {
  title: 'logstash-*',
  fields: {
    raw: [
      {
        name: 'response',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
};

describe('QueryBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = shallow(
      <QueryBar
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should pass the query language to the language switcher', () => {
    const component = shallow(
      <QueryBar
        query={luceneQuery}
        onSubmit={noop}
        appName={'discover'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should disable autoFocus on EuiFieldText when disableAutoFocus prop is true', () => {
    const component = shallow(
      <QueryBar
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    shallow(
      <QueryBar
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
      />
    );

    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it("Should store the user's query preference in localstorage", () => {
    const mockStorage = createMockStorage();

    const component = shallow(
      <QueryBar
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        indexPatterns={[mockIndexPattern]}
        store={mockStorage}
        disableAutoFocus={true}
      />
    );

    component.find(QueryLanguageSwitcher).simulate('selectLanguage', 'lucene');
    expect(mockStorage.set).toHaveBeenCalledWith('kibana.userQueryLanguage', 'lucene');
  });
});
