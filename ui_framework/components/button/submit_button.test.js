import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
  KuiSubmitButton,
} from './button';

describe('KuiSubmitButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = shallow(
        <KuiSubmitButton />
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('type', () => {
      describe('basic', () => {
        test('renders the basic class', () => {
          const $button = render(
            <KuiSubmitButton type="basic" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('hollow', () => {
        test('renders the hollow class', () => {
          const $button = render(
            <KuiSubmitButton type="hollow" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('danger', () => {
        test('renders the danger class', () => {
          const $button = render(
            <KuiSubmitButton type="danger" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });

      describe('primary', () => {
        test('renders the primary class', () => {
          const $button = render(
            <KuiSubmitButton type="primary" />
          );

          expect($button)
            .toMatchSnapshot();
        });
      });
    });

    describe('testSubject', () => {
      test('is rendered', () => {
        const $button = shallow(
          <KuiSubmitButton testSubject="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('children', () => {
      test('is rendered as value', () => {
        const $button = shallow(
          <KuiSubmitButton>
            Hello
          </KuiSubmitButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiSubmitButton onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiSubmitButton onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });

      test('receives the data prop', () => {
        const onClickHandler = sinon.stub();
        const data = 'data';

        const $button = shallow(
          <KuiSubmitButton onClick={onClickHandler} data={data} />
        );

        $button.simulate('click');

        sinon.assert.calledWith(onClickHandler, data);
      });
    });

    describe('isDisabled', () => {
      test('sets the disabled attribute', () => {
        const $button = shallow(
          <KuiSubmitButton isDisabled />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`prevents onClick from being called`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiSubmitButton isDisabled onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.notCalled(onClickHandler);
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = shallow(
          <KuiSubmitButton className="testClass1 testClass2" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });
});
