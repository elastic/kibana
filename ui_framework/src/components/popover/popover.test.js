import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPopover } from './popover';

describe('KuiPopover', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
        closePopover={() => {}}
        {...requiredProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('children is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
        closePopover={() => {}}
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
          closePopover={() => {}}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('left is rendered', () => {
      const component = render(
        <KuiPopover
          button={<button />}
          closePopover={() => {}}
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
          closePopover={() => {}}
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
          closePopover={() => {}}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('renders true', () => {
      const component = render(
        <KuiPopover
          button={<button />}
          closePopover={() => {}}
          isOpen={true}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
