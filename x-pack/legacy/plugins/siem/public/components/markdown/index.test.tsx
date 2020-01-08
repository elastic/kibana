/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { Markdown } from '.';

describe('Markdown', () => {
  test(`it renders when raw markdown is NOT provided`, () => {
    const wrapper = mount(<Markdown />);

    expect(wrapper.find('[data-test-subj="markdown"]').exists()).toEqual(true);
  });

  test('it renders plain text', () => {
    const raw = 'this has no special markdown formatting';
    const wrapper = mount(<Markdown raw={raw} />);

    expect(
      wrapper
        .find('[data-test-subj="markdown-root"]')
        .first()
        .text()
    ).toEqual(raw);
  });

  test('it applies the EUI text style to all markdown content', () => {
    const wrapper = mount(<Markdown raw={'#markdown'} />);

    expect(
      wrapper
        .find('[data-test-subj="markdown-root"]')
        .first()
        .childAt(0)
        .hasClass('euiText')
    ).toBe(true);
  });

  describe('markdown tables', () => {
    const headerColumns = ['we', 'support', 'markdown', 'tables'];
    const header = `| ${headerColumns[0]} | ${headerColumns[1]} | ${headerColumns[2]} | ${headerColumns[3]} |`;

    const rawTable = `${header}\n|---------|---------|------------|--------|\n| because | tables  | are        | pretty |\n| useful  | for     | formatting | data   |`;

    test('it applies EUI table styling to tables', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('table')
          .first()
          .childAt(0)
          .hasClass('euiTable')
      ).toBe(true);
    });

    headerColumns.forEach(headerText => {
      test(`it renders the "${headerText}" table header`, () => {
        const wrapper = mount(<Markdown raw={rawTable} />);

        expect(
          wrapper
            .find('[data-test-subj="markdown-table-header"]')
            .first()
            .text()
        ).toContain(headerText);
      });
    });

    test('it applies EUI table styling to table rows', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-table-row"]')
          .first()
          .childAt(0)
          .hasClass('euiTableRow')
      ).toBe(true);
    });

    test('it applies EUI table styling to table cells', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-table-cell"]')
          .first()
          .childAt(0)
          .hasClass('euiTableRowCell')
      ).toBe(true);
    });

    test('it renders the expected table content', () => {
      const wrapper = shallow(<Markdown raw={rawTable} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('markdown links', () => {
    const markdownWithLink = 'A link to an external site [External Site](https://google.com)';

    test('it renders the expected link text', () => {
      const wrapper = mount(<Markdown raw={markdownWithLink} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-link"]')
          .first()
          .text()
      ).toEqual('External Site');
    });

    test('it renders the expected href', () => {
      const wrapper = mount(<Markdown raw={markdownWithLink} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-link"]')
          .first()
          .getDOMNode()
      ).toHaveProperty('href', 'https://google.com/');
    });

    test('it opens links in a new tab via target="_blank"', () => {
      const wrapper = mount(<Markdown raw={markdownWithLink} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-link"]')
          .first()
          .getDOMNode()
      ).toHaveProperty('target', '_blank');
    });

    test('it sets the link `rel` attribute to `noopener` to prevent the new page from accessing `window.opener`, `nofollow` to note the link is not endorsed by us, and noreferrer to prevent the browser from sending the current address', () => {
      const wrapper = mount(<Markdown raw={markdownWithLink} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-link"]')
          .first()
          .getDOMNode()
      ).toHaveProperty('rel', 'nofollow noopener noreferrer');
    });

    test('it renders the expected content containing a link', () => {
      const wrapper = shallow(<Markdown raw={markdownWithLink} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
