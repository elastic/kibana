import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiExpressionItemPopover,
  POPOVER_ALIGN
} from './expression_item_popover';

describe('KuiExpressionItemPopover', () => {
  test('renders', () => {
    const component = (
      <KuiExpressionItemPopover
        title="title"
        align="left"
        onOutsideClick={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('children', () => {
      test('is rendered', () => {
        const component = render(
          <KuiExpressionItemPopover
            title="title"
            align="left"
            onOutsideClick={()=>{}}
          >
            popover content
          </KuiExpressionItemPopover>
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('align', () => {
      test('renders default', () => {
        const component = render(
          <KuiExpressionItemPopover
            title="title"
            onOutsideClick={()=>{}}
          />
        );

        expect(component).toMatchSnapshot();
      });

      POPOVER_ALIGN.forEach(align => {
        test(`renders the ${align} class`, () => {
          const component = render(
            <KuiExpressionItemPopover
              title="title"
              align={align}
              onOutsideClick={()=>{}}
            />
          );

          expect(component).toMatchSnapshot();
        });
      });
    });
  });
});
