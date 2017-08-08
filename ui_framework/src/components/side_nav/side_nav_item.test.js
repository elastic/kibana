import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiSideNavItem } from './side_nav_item';

describe('KuiSideNavItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSideNavItem>
        <button {...requiredProps} />
      </KuiSideNavItem>
    );

    expect(component)
      .toMatchSnapshot();
  });

  test(`preserves child's classes`, () => {
    const component = render(
      <KuiSideNavItem>
        <button className="test" />
      </KuiSideNavItem>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('isSelected', () => {
    test('defaults to false', () => {
      const component = render(
        <KuiSideNavItem>
          <button />
        </KuiSideNavItem>
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('is rendered when specified as true', () => {
      const component = render(
        <KuiSideNavItem isSelected>
          <button />
        </KuiSideNavItem>
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
