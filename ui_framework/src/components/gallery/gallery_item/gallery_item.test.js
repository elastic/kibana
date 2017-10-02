import React from 'react';
import sinon from 'sinon';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItem,
} from './gallery_item';

test('renders KuiGalleryItem with href', () => {
  const component = <KuiGalleryItem href="#" {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiGalleryItem with onClick', () => {
  const component = <KuiGalleryItem onClick={() => {}} {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiGalleryItem without href and onClick', () => {
  const component = <KuiGalleryItem {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('KuiGalleryItem will throw when specified href and onClick', () => {
  const consoleError = sinon.stub(console, 'error');
  render(<KuiGalleryItem href="#" onClick={() => {}} {...requiredProps}>children</KuiGalleryItem>);
  expect(consoleError.calledOnce).toBe(true);
  const msg = consoleError.getCalls()[0].args[0];
  expect(msg).toContain('Failed prop type');
  console.error.restore();
});
