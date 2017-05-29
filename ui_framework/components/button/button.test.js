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

    test('HTML attributes are rendered', () => {
      const $button = render(
        <KuiButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
          type="submit"
          disabled
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
            const $button = render(<KuiButton buttonType={buttonType} />);
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

        shallow(
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
