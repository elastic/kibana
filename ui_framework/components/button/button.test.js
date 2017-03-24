import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';

import {
  BUTTON_TYPES,
  KuiButton,
} from './button';

describe('KuiButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(
        <KuiButton />
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe('HTML attributes', () => {
    describe('aria-label', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiButton aria-label="aria label" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('disabled', () => {
      test('sets the disabled attribute and class', () => {
        const $button = render(
          <KuiButton disabled />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('data-test-subj', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiButton data-test-subj="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = render(
          <KuiButton className="testClass1 testClass2" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });

  describe('Props', () => {
    describe('type', () => {
      BUTTON_TYPES.forEach(type => {
        describe(type, () => {
          test(`renders the ${type} class`, () => {
            const $button = render(<KuiButton type={ type } />);
            expect($button).toMatchSnapshot();
          });
        });
      });
    });

    describe('icon', () => {
      test('is rendered with children', () => {
        const $button = render(
          <KuiButton icon="Icon">
            Hello
          </KuiButton>
        );

        expect($button)
          .toMatchSnapshot();
      });

      test('is rendered without children', () => {
        const $button = render(
          <KuiButton icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('iconPosition', () => {
      test('moves the icon to the right', () => {
        const $button = render(
          <KuiButton
            icon="Icon"
            iconPosition="right"
          >
            Hello
          </KuiButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('children', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiButton>
            Hello
          </KuiButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiButton onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiButton onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });

    describe('isLoading', () => {
      test('renders a spinner', () => {
        const $button = render(
          <KuiButton isLoading />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`doesn't render the icon prop`, () => {
        const $button = render(
          <KuiButton isLoading icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });
});
