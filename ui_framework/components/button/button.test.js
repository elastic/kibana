import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
  BUTTON_TYPES,
  KuiButton,
} from './button';

describe('KuiButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = shallow(
        <KuiButton />
      );

      expect($button)
        .toMatchSnapshot();
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

    describe('data-test-subj', () => {
      test('is rendered', () => {
        const $button = shallow(
          <KuiButton data-test-subj="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('icon', () => {
      test('is rendered with children', () => {
        const $button = shallow(
          <KuiButton icon="Icon">
            Hello
          </KuiButton>
        );

        expect($button)
          .toMatchSnapshot();
      });

      test('is rendered without children', () => {
        const $button = shallow(
          <KuiButton icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('iconPosition', () => {
      test('moves the icon to the right', () => {
        const $button = shallow(
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
        const $button = shallow(
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

      test('receives the data prop', () => {
        const onClickHandler = sinon.stub();
        const data = 'data';

        const $button = shallow(
          <KuiButton onClick={onClickHandler} data={data} />
        );

        $button.simulate('click');

        sinon.assert.calledWith(onClickHandler, data);
      });
    });

    describe('isDisabled', () => {
      test('sets the disabled attribute', () => {
        const $button = shallow(
          <KuiButton isDisabled />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`prevents onClick from being called`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiButton isDisabled onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.notCalled(onClickHandler);
      });
    });

    describe('isLoading', () => {
      test('renders a spinner', () => {
        const $button = shallow(
          <KuiButton isLoading />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`doesn't render the icon prop`, () => {
        const $button = shallow(
          <KuiButton isLoading icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = shallow(
          <KuiButton className="testClass1 testClass2" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });
});
