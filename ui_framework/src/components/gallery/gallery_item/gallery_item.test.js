import React from 'react';
import sinon from 'sinon';
import { render, shallow } from 'enzyme';
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

test('onClick on KuiGalleryItem is not triggered without click', () => {
  const onClickSpy = sinon.spy();
  render(<KuiGalleryItem onClick={onClickSpy} {...requiredProps}>children</KuiGalleryItem>);
  sinon.assert.notCalled(onClickSpy);
});

test('onClick on KuiGalleryItem is triggered when clicked', () => {
  const onClickSpy = sinon.spy();
  const element = shallow(<KuiGalleryItem onClick={onClickSpy} {...requiredProps}>children</KuiGalleryItem>);
  element.simulate('click');
  sinon.assert.calledOnce(onClickSpy);
});

test('KuiGalleryItem will throw when specified href and onClick', () => {
  const consoleError = sinon.stub(console, 'error');
  render(<KuiGalleryItem href="#" onClick={() => {}} {...requiredProps}>children</KuiGalleryItem>);
  expect(consoleError.calledOnce).toBe(true);
  const msg = consoleError.getCalls()[0].args[0];
  expect(msg).toContain('Failed prop type');
  console.error.restore();
});
