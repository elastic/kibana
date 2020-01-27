/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Feature } from '../../../../../../../../plugins/features/public';
import { Space } from '../../../../../common/model/space';
import { SectionPanel } from '../section_panel';
import { EnabledFeatures } from './enabled_features';

const features: Feature[] = [
  {
    id: 'feature-1',
    name: 'Feature 1',
    icon: 'spacesApp',
    app: [],
    privileges: {},
  },
  {
    id: 'feature-2',
    name: 'Feature 2',
    icon: 'spacesApp',
    app: [],
    privileges: {},
  },
];

const space: Space = {
  id: 'my-space',
  name: 'my space',
  disabledFeatures: ['feature-1', 'feature-2'],
};

const capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
  spaces: {
    manage: true,
  },
};

describe('EnabledFeatures', () => {
  it(`renders as expected`, () => {
    expect(
      shallowWithIntl<EnabledFeatures>(
        <EnabledFeatures
          features={features}
          space={space}
          capabilities={capabilities}
          intl={null as any}
          onChange={jest.fn()}
        />
      )
    ).toMatchSnapshot();
  });

  it('allows all features to be toggled on', () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={space}
        capabilities={capabilities}
        intl={null as any}
        onChange={changeHandler}
      />
    );

    // expand section panel
    wrapper
      .find(SectionPanel)
      .find(EuiLink)
      .simulate('click');

    // Click the "Change all" link
    wrapper
      .find('.spcToggleAllFeatures__changeAllLink')
      .first()
      .simulate('click');

    // Ask to show all features
    wrapper.find('button[data-test-subj="spc-toggle-all-features-show"]').simulate('click');

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual([]);
  });

  it('allows all features to be toggled off', () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={space}
        capabilities={capabilities}
        intl={null as any}
        onChange={changeHandler}
      />
    );

    // expand section panel
    wrapper
      .find(SectionPanel)
      .find(EuiLink)
      .simulate('click');

    // Click the "Change all" link
    wrapper
      .find('.spcToggleAllFeatures__changeAllLink')
      .first()
      .simulate('click');

    // Ask to hide all features
    wrapper.find('button[data-test-subj="spc-toggle-all-features-hide"]').simulate('click');

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual(['feature-1', 'feature-2']);
  });
});
