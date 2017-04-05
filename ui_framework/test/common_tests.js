import React from 'react';
import { render } from 'enzyme';

/**
 * Ensures the rendered class matches the jest snapshot.
 * @param reactClass
 * @param props
 */
export function basicRenderTest(reactClass, props = {}) {
  const element = React.createElement(reactClass, props);
  const $renderedElement = render(element);
  expect($renderedElement).toMatchSnapshot();
}

/**
 * Ensures a class with basic HTML properties passed in matches the jest snapshot.
 * @param reactClass
 * @param props
 */
export function basicHtmlAttributesRenderTest(reactClass, props = {}) {
  const element = React.createElement(reactClass, Object.assign(props, {
    'aria-label': 'aria-label',
    'className': 'testClass1 testClass2',
    'data-test-subj': 'test subject string'
  }));
  const $renderedElement = render(element);
  expect($renderedElement).toMatchSnapshot();
}

/**
 * Ensures a class rendered with children matches the jest snapshot.
 * @param reactClass
 * @param props
 */
export function basicRendersChildrenTest(reactClass, props = {}) {
  const element = React.createElement(reactClass, props, 'hello');
  const $renderedElement = render(element);
  expect($renderedElement).toMatchSnapshot();
}
