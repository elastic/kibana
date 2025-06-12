/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { SpaceAvatarInternal } from './space_avatar_internal';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiAvatar: () => <></>, // we mock this to avoid asserting what the internals of the avatar looks like in our snapshots below
}));

test('renders without crashing', () => {
  const wrapper = shallow(<SpaceAvatarInternal space={{ name: '', id: '' }} />);
  expect(wrapper).toMatchInlineSnapshot(`
    <EuiAvatar
      color="#FFC9C2"
      data-test-subj="space-avatar-"
      initials=""
      initialsLength={2}
      name=""
      size="m"
      type="space"
    />
  `);
});

test('renders with a space name entirely made of whitespace', () => {
  const wrapper = shallow(<SpaceAvatarInternal space={{ name: '      ', id: '' }} />);
  expect(wrapper).toMatchInlineSnapshot(`
    <EuiAvatar
      color="#61A2FF"
      data-test-subj="space-avatar-"
      initials=""
      initialsLength={2}
      name=""
      size="m"
      type="space"
    />
  `);
});

test('removes aria-label when instructed not to announce the space name', () => {
  const wrapper = mount(
    <SpaceAvatarInternal space={{ name: '', id: '' }} announceSpaceName={false} />
  );
  expect(wrapper).toMatchInlineSnapshot(`
    <SpaceAvatarInternal
      announceSpaceName={false}
      space={
        Object {
          "id": "",
          "name": "",
        }
      }
    >
      <EuiAvatar
        aria-hidden={true}
        aria-label=""
        color="#FFC9C2"
        data-test-subj="space-avatar-"
        initials=""
        initialsLength={2}
        name=""
        size="m"
        type="space"
      />
    </SpaceAvatarInternal>
  `);
});
