import React from 'react';
import { shallow } from 'enzyme';

import {
  Markdown,
} from './markdown';

test('render', () => {
  const component = shallow(<Markdown/>);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should never render html tags', () => {
  const component = shallow(<Markdown
    markdown="<div>I may be dangerous if rendered as html</div>"
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {

  const markdown = 'I am *some* [content](https://en.wikipedia.org/wiki/Content) with `markdown`';

  test('markdown', () => {
    const component = shallow(<Markdown
      markdown={markdown}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('openLinksInNewTab', () => {
    const component = shallow(<Markdown
      markdown={markdown}
      openLinksInNewTab={true}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('whiteListedRules', () => {
    const component = shallow(<Markdown
      markdown={markdown}
      whiteListedRules={['backticks', 'emphasis']}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('should update markdown when openLinksInNewTab prop change', () => {
    const component = shallow(<Markdown
      markdown={markdown}
      openLinksInNewTab={false}
    />);
    expect(component.render().find('a').prop('target')).not.toBe('_blank');
    component.setProps({ openLinksInNewTab: true });
    expect(component.render().find('a').prop('target')).toBe('_blank');
  });

  test('should update markdown when whiteListedRules prop change', () => {
    const markdown = '*emphasis* `backticks`';
    const component = shallow(<Markdown
      markdown={markdown}
      whiteListedRules={['emphasis', 'backticks']}
    />);
    expect(component.render().find('em')).toHaveLength(1);
    expect(component.render().find('code')).toHaveLength(1);
    component.setProps({ whiteListedRules: ['backticks'] });
    expect(component.render().find('code')).toHaveLength(1);
    expect(component.render().find('em')).toHaveLength(0);
  });
});
