/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { TestProviders } from '../../mock';

import { Ja3Fingerprint } from '.';

describe('Ja3Fingerprint', () => {
  let root: HTMLElement;

  // https://github.com/atlassian/react-beautiful-dnd/issues/1593
  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  test('renders the expected label', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>,
      { attachTo: root }
    );

    expect(
      wrapper
        .find('[data-test-subj="ja3-fingerprint-label"]')
        .first()
        .text()
    ).toEqual('ja3');
  });

  test('renders the fingerprint as text', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>,
      { attachTo: root }
    );

    expect(
      wrapper
        .find('[data-test-subj="ja3-fingerprint-link"]')
        .first()
        .text()
    ).toEqual('fff799d91b7c01ae3fe6787cfc895552');
  });

  test('it renders a hyperlink to an external site to compare the fingerprint against a known set of signatures', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>,
      { attachTo: root }
    );

    expect(
      wrapper
        .find('[data-test-subj="ja3-fingerprint-link"]')
        .first()
        .props().href
    ).toEqual('https://sslbl.abuse.ch/ja3-fingerprints/fff799d91b7c01ae3fe6787cfc895552');
  });
});
