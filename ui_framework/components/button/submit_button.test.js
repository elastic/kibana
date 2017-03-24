/* eslint-disable no-undef */

import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';

import {
  KuiSubmitButton,
} from './button';

describe('KuiSubmitButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(
        <KuiSubmitButton />
      );

      expect($button)
        .toMatchSnapshot();
    });

    test('HTML attributes are rendered', () => {
      const $button = render(
        <KuiSubmitButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
          disabled
        />
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe('HTML attributes', () => {
    describe('aria-label', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiSubmitButton aria-label="aria label" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('data-test-subj', () => {
      test('is rendered', () => {
        const $button = render(
          <KuiSubmitButton data-test-subj="test subject string" />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('disabled', () => {
      test('sets the disabled attribute and class', () => {
        const $button = render(
          <KuiSubmitButton disabled />
        );

        expect($button)
          .toMatchSnapshot();
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $button = render(
          <KuiSubmitButton className="testClass1 testClass2" />
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

    describe('children', () => {
      test('is rendered as value', () => {
        const $button = render(
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

        shallow(
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
    });
  });
});
