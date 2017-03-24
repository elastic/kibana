/* eslint-disable no-undef */

import React from 'react';
import { render } from 'enzyme';

import {
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
  });

  describe('HTML attributes', () => {
    describe('href', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiLinkButton href="#" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('target', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiLinkButton target="_blank" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('aria-label', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiLinkButton aria-label="aria label" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('disabled', () => {
      test('sets the disabled class', () => {
        const $button = render(
          <KuiLinkButton disabled />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('data-test-subj', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiLinkButton data-test-subj="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = render(
          <KuiLinkButton className="testClass1 testClass2" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });

  describe('Props', () => {
    describe('type', () => {
      describe('basic', () => {
        test('renders the basic class', () => {
          const $button = render(
            <KuiLinkButton type="basic" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('hollow', () => {
        test('renders the hollow class', () => {
          const $button = render(
            <KuiLinkButton type="hollow" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('danger', () => {
        test('renders the danger class', () => {
          const $button = render(
            <KuiLinkButton type="danger" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('primary', () => {
        test('renders the primary class', () => {
          const $button = render(
            <KuiLinkButton type="primary" />
          );

          expect($button)
            .toMatchSnapshot();
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
