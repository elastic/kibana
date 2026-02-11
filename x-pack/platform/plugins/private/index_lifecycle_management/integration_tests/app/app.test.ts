/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';

import * as hooks from '../../public/application/lib/use_is_read_only';
import { getDefaultHotPhasePolicy } from '../edit_policy/constants';
import { setupEnvironment } from '../helpers/setup_environment';

import { getDoubleEncodedPolicyEditPath, getEncodedPolicyEditPath, setup } from './app.helpers';

const SPECIAL_CHARS_NAME = 'test?#$+=&@:';
const PERCENT_SIGN_NAME = 'test%';
// navigation doesn't work for % with other special chars or sequence %25
// known issue https://github.com/elastic/kibana/issues/82440
const PERCENT_SIGN_WITH_OTHER_CHARS_NAME = 'test%#';
const PERCENT_SIGN_25_SEQUENCE = 'test%25';

const createPolicyTitle = 'Create policy';
const editPolicyTitle = 'Edit policy';

window.scrollTo = jest.fn();

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiIcon: 'eui-icon', // using custom react-svg icon causes issues, mocking for now.
  };
});

describe('<App />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
    jest.spyOn(hooks, 'useIsReadOnly').mockReturnValue(false);
  });

  describe('new policy creation', () => {
    test('when there are no policies', async () => {
      httpRequestsMockHelpers.setLoadPolicies([]);
      const { actions } = await setup(httpSetup, ['/policies']);

      await actions.clickCreatePolicyButton();

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(createPolicyTitle);
      expect(screen.getByTestId('policyNameField')).toHaveValue('');
    });

    test('when there are policies', async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy()]);
      const { actions } = await setup(httpSetup, ['/policies']);

      await actions.clickCreatePolicyButton();

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(createPolicyTitle);
      expect(screen.getByTestId('policyNameField')).toHaveValue('');
    });
  });

  describe('navigation with special characters', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(SPECIAL_CHARS_NAME)]);
    });

    test('clicking policy name in the table works', async () => {
      const { actions } = await setup(httpSetup, ['/policies']);

      await actions.clickPolicyNameLink();

      expect(await screen.findByTestId('policyFlyoutTitle')).toHaveTextContent(SPECIAL_CHARS_NAME);
    });

    test('loading edit policy page url works', async () => {
      await setup(httpSetup, [getEncodedPolicyEditPath(SPECIAL_CHARS_NAME)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${SPECIAL_CHARS_NAME}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await setup(httpSetup, [getDoubleEncodedPolicyEditPath(SPECIAL_CHARS_NAME)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${SPECIAL_CHARS_NAME}`
      );
    });
  });

  describe('navigation with percent sign', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(PERCENT_SIGN_NAME)]);
    });

    test('loading edit policy page url works', async () => {
      await setup(httpSetup, [getEncodedPolicyEditPath(PERCENT_SIGN_NAME)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_NAME}`
      );
    });

    test('loading edit policy page url with double encoding works', async () => {
      await setup(httpSetup, [getDoubleEncodedPolicyEditPath(PERCENT_SIGN_NAME)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_NAME}`
      );
    });
  });

  describe('navigation with percent sign with other special characters', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(PERCENT_SIGN_WITH_OTHER_CHARS_NAME),
      ]);
    });

    test('clicking policy name in the table works', async () => {
      const { actions } = await setup(httpSetup, ['/policies']);

      await actions.clickPolicyNameLink();

      expect(await screen.findByTestId('policyFlyoutTitle')).toHaveTextContent(
        PERCENT_SIGN_WITH_OTHER_CHARS_NAME
      );
    });

    test("loading edit policy page url doesn't work", async () => {
      await setup(httpSetup, [getEncodedPolicyEditPath(PERCENT_SIGN_WITH_OTHER_CHARS_NAME)]);

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(await screen.findByTestId('policyTitle')).not.toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await setup(httpSetup, [getDoubleEncodedPolicyEditPath(PERCENT_SIGN_WITH_OTHER_CHARS_NAME)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });
  });

  describe('navigation with %25 sequence', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(PERCENT_SIGN_25_SEQUENCE)]);
    });

    test('clicking policy name in the table works correctly', async () => {
      const { actions } = await setup(httpSetup, ['/policies']);

      await actions.clickPolicyNameLink();

      expect(await screen.findByTestId('policyFlyoutTitle')).toHaveTextContent(
        PERCENT_SIGN_25_SEQUENCE
      );
    });

    test("loading edit policy page url doesn't work", async () => {
      await setup(httpSetup, [getEncodedPolicyEditPath(PERCENT_SIGN_25_SEQUENCE)]);

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(await screen.findByTestId('policyTitle')).not.toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_25_SEQUENCE}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await setup(httpSetup, [getDoubleEncodedPolicyEditPath(PERCENT_SIGN_25_SEQUENCE)]);

      expect(await screen.findByTestId('policyTitle')).toHaveTextContent(
        `${editPolicyTitle} ${PERCENT_SIGN_25_SEQUENCE}`
      );
    });
  });
});
