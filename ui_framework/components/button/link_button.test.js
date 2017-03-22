import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
  KuiLinkButton,
} from './button';

describe('KuiLinkButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = shallow(
        <KuiLinkButton />
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

    describe('testSubject', () => {
      test('is rendered', () => {
        const $button = shallow(
          <KuiLinkButton testSubject="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('icon', () => {
      test('is rendered with children', () => {
        const $button = shallow(
          <KuiLinkButton icon="Icon">
            Hello
          </KuiLinkButton>
        );

        expect($button)
          .toMatchSnapshot();
      });

      test('is rendered without children', () => {
        const $button = shallow(
          <KuiLinkButton icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('iconPosition', () => {
      test('moves the icon to the right', () => {
        const $button = shallow(
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
        const $button = shallow(
          <KuiLinkButton>
            Hello
          </KuiLinkButton>
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('href', () => {
      test('is rendered', () => {
        const $button = shallow(
          <KuiLinkButton href="#" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('target', () => {
      test('is rendered', () => {
        const $button = shallow(
          <KuiLinkButton target="_blank" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiLinkButton onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiLinkButton onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });

      test('receives the data prop', () => {
        const onClickHandler = sinon.stub();
        const data = 'data';

        const $button = shallow(
          <KuiLinkButton onClick={onClickHandler} data={data} />
        );

        $button.simulate('click');

        sinon.assert.calledWith(onClickHandler, data);
      });
    });

    describe('isDisabled', () => {
      test('sets the disabled attribute', () => {
        const $button = shallow(
          <KuiLinkButton isDisabled />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`prevents onClick from being called`, () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiLinkButton isDisabled onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.notCalled(onClickHandler);
      });
    });

    describe('isLoading', () => {
      test('renders a spinner', () => {
        const $button = shallow(
          <KuiLinkButton isLoading />
        );

        expect($button)
          .toMatchSnapshot();
      });

      test(`doesn't render the icon prop`, () => {
        const $button = shallow(
          <KuiLinkButton isLoading icon="Icon" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = shallow(
          <KuiLinkButton className="testClass1 testClass2" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });
  });
});
