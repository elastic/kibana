import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPopover } from './popover';

describe('KuiPopover', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
        { ...requiredProps }
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('children is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
      >
        Children
      </KuiPopover>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('anchorPosition', () => {
    test('defaults to center', () => {
      const component = render(
        <KuiPopover
          button={<button />}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('left is rendered', () => {
      const component = render(
        <KuiPopover
          button={<button />}
          anchorPosition="left"
        />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('right is rendered', () => {
      const component = render(
        <KuiPopover
          button={<button />}
          anchorPosition="right"
        />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });

  describe('isOpen', () => {
    test('defaults to false', () => {
      const component = render(
        <KuiPopover
          button={<button />}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('true is rendered', () => {
      const component = render(
        <KuiPopover
          button={<button />}
          isOpen={true}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
