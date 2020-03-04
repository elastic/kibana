/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { createPublicShim } from '../../../../../shim';
import { getAppProviders } from '../../../../app_dependencies';
import { getPivotQuery } from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { SourceIndexPreview } from './source_index_preview';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

jest.mock('ui/new_platform');
jest.mock('../../../../../shared_imports');

describe('Transform: <SourceIndexPreview />', () => {
  test('Minimal initialization', () => {
    const props = {
      indexPattern: {
        title: 'the-index-pattern-title',
        fields: [] as any[],
      } as SearchItems['indexPattern'],
      query: getPivotQuery('the-query'),
    };

    const Providers = getAppProviders(createPublicShim());
    const wrapper = shallow(
      <Providers>
        <SourceIndexPreview {...props} />
      </Providers>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
