/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { KibanaContext } from '../../../../../contexts/kibana';
import { kibanaContextValueMock } from '../../../../../contexts/kibana/__mocks__/kibana_context_value';

import { getPivotQuery } from '../../../../common';

import { SourceIndexPreview } from './source_index_preview';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <SourceIndexPreview />', () => {
  test('Minimal initialization', () => {
    const props = {
      query: getPivotQuery('the-query'),
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <KibanaContext.Provider value={kibanaContextValueMock}>
          <SourceIndexPreview {...props} />
        </KibanaContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
