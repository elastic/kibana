/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mount } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import { PageIntroduction } from './page_introduction';

describe('PageIntroduction component', () => {
  it('renders with title as a string', () => {
    const wrapper = mount(<PageIntroduction title="string title" description="some description" />);
    // .hostNodes is required due to Emotion injection causing problems with enzyme
    const titleContainer = wrapper
      .find('[data-test-subj="pageIntroductionTitleContainer"]')
      .hostNodes();
    expect(titleContainer).toHaveLength(1);

    expect(titleContainer.text()).toEqual('string title');
  });

  it('renders title as React node', () => {
    const wrapper = mount(
      <PageIntroduction
        title={<h2 data-test-subj="injected">react node title</h2>}
        description="some description"
      />
    );
    // .hostNodes is required due to Emotion injection causing problems with enzyme
    const titleContainer = wrapper.find('[data-test-subj="injected"]').hostNodes();
    expect(titleContainer).toHaveLength(1);

    expect(titleContainer.text()).toEqual('react node title');
  });

  it('renders with description only', () => {
    const wrapper = mount(<PageIntroduction description="some description" />);
    // .hostNodes is required due to Emotion injection causing problems with enzyme
    const titleContainer = wrapper
      .find('[data-test-subj="pageIntroductionTitleContainer"]')
      .hostNodes();

    const descriptionContainer = wrapper
      .find('[data-test-subj="pageIntroductionDescriptionText"]')
      .hostNodes();
    expect(titleContainer).toHaveLength(1);
    expect(descriptionContainer).toHaveLength(1);

    expect(titleContainer.text()).toEqual('');
    expect(descriptionContainer.text()).toEqual('some description');
  });

  it('renders with single link', () => {
    const wrapper = mount(
      <PageIntroduction
        description="some description"
        title="some title"
        links={
          <EuiLink href="testlink" external>
            test link to nowhere
          </EuiLink>
        }
      />
    );
    const links = wrapper.find(EuiLink);
    expect(links).toHaveLength(1);
    expect(links.prop('href')).toEqual('testlink');
    // due to accesibility injections text includes screen reader text as well
    expect(links.text().startsWith('test link to nowhere')).toBe(true);
  });

  it('renders with multiple links', () => {
    const wrapper = mount(
      <PageIntroduction
        description="some description"
        title="some title"
        links={[
          <EuiLink href="testlink" external>
            test link to nowhere
          </EuiLink>,
          <EuiLink href="testlink2" external>
            test link to nowhere2
          </EuiLink>,
        ]}
      />
    );
    const links = wrapper.find(EuiLink);
    expect(links).toHaveLength(2);
    expect(links.at(0).prop('href')).toEqual('testlink');
    // due to accesibility injections text includes screen reader text as well
    expect(links.at(0).text().startsWith('test link to nowhere')).toBe(true);
    expect(links.at(1).prop('href')).toEqual('testlink2');
    // due to accesibility injections text includes screen reader text as well
    expect(links.at(1).text().startsWith('test link to nowhere2')).toBe(true);
  });

  it('renders with single actions', () => {
    const wrapper = mount(
      <PageIntroduction
        description="some description"
        title="some title"
        actions={<button>some action</button>}
      />
    );
    const actions = wrapper.find('button');
    expect(actions).toHaveLength(1);
    expect(actions.text()).toEqual('some action');
  });

  it('renders with multiple action', () => {
    const wrapper = mount(
      <PageIntroduction
        description="some description"
        title="some title"
        actions={[<button>some action</button>, <button>another action</button>]}
      />
    );
    const actions = wrapper.find('button');
    expect(actions).toHaveLength(2);
    expect(actions.at(0).text()).toEqual('some action');
    expect(actions.at(1).text()).toEqual('another action');
  });
});
