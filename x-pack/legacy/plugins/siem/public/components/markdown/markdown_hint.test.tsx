/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { MarkdownHintComponent } from './markdown_hint';

describe.skip('MarkdownHintComponent ', () => {
  test('it has inline visibility when show is true', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'inline'
    );
  });

  test('it has hidden visibility when show is false', () => {
    const wrapper = mount(<MarkdownHintComponent show={false} />);

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'hidden'
    );
  });

  test('it renders the heading hint', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(
      wrapper
        .find('[data-test-subj="heading-hint"]')
        .first()
        .text()
    ).toEqual('# heading');
  });

  test('it renders the bold hint with a bold font-weight', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="bold-hint"]').first()).toHaveStyleRule(
      'font-weight',
      'bold'
    );
  });

  test('it renders the italic hint with an italic font-style', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="italic-hint"]').first()).toHaveStyleRule(
      'font-style',
      'italic'
    );
  });

  test('it renders the code hint with a monospace font family', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="code-hint"]').first()).toHaveStyleRule(
      'font-family',
      'monospace'
    );
  });

  test('it renders the preformatted hint with a monospace font family', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="preformatted-hint"]').first()).toHaveStyleRule(
      'font-family',
      'monospace'
    );
  });

  test('it renders the strikethrough hint with a line-through text-decoration', () => {
    const wrapper = mount(<MarkdownHintComponent show={true} />);

    expect(wrapper.find('[data-test-subj="strikethrough-hint"]').first()).toHaveStyleRule(
      'text-decoration',
      'line-through'
    );
  });

  describe('rendering', () => {
    test('it renders the expected hints', () => {
      const wrapper = shallow(<MarkdownHintComponent show={true} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
