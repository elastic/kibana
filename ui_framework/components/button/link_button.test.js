import React from 'react';
import { render } from 'enzyme';

import {
  BUTTON_TYPES,
  KuiLinkButton,
} from './button';

describe('KuiLinkButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(
        <KuiLinkButton />
      );

      expect($button)
        .toMatchSnapshot();
    });

    test('HTML attributes are rendered (and disabled renders a class)', () => {
      const $button = render(
        <KuiLinkButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
          disabled
          type="submit"
          href="#"
          target="_blank"
        />
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('buttonType', () => {
      BUTTON_TYPES.forEach(buttonType => {
        describe(buttonType, () => {
          test(`renders the ${buttonType} class`, () => {
            const $button = render(<KuiLinkButton buttonType={buttonType} />);
            expect($button).toMatchSnapshot();
          });
        });
      });
    });

    describe('icon', () => {
      test('is rendered with children', () => {
        const $button = render(
          <KuiLinkButton icon="Icon">
            Hello
          </KuiLinkButton>
        );

        expect($button)
          .toMatchSnapshot();
      });

      test('is rendered without children', () => {
        const $button = render(
          <KuiLinkButton icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('iconPosition', () => {
      test('moves the icon to the right', () => {
        const $button = render(
          <KuiLinkButton
            icon="Icon"
            iconPosition="right"
          >
            Hello
          </KuiLinkButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('children', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiLinkButton>
            Hello
          </KuiLinkButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('isLoading', () => {
      test('renders a spinner', () => {
        const $button = render(
          <KuiLinkButton isLoading />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`doesn't render the icon prop`, () => {
        const $button = render(
          <KuiLinkButton isLoading icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });
});
