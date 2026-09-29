/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import type { ComponentType, ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { TestProviders } from '../../common/mock';
import { UserActionTimestamp } from './timestamp';

vi.mock('@kbn/i18n-react', async () => {
  const { i18n } = (await vi.importActual('@kbn/i18n'));
  i18n.init({ locale: 'en' });

  const originalModule = (await vi.importActual('@kbn/i18n-react'));
  const FormattedRelative = vi.fn();
  FormattedRelative.mockImplementationOnce(() => '2 days ago');
  FormattedRelative.mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

const props = {
  createdAt: '2020-09-06T14:40:59.889Z',
  updatedAt: '2020-09-07T14:40:59.889Z',
};

describe('UserActionTimestamp ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionTimestamp {...props} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="user-action-title-creation-relative-time"]').first().exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="user-action-title-edited-relative-time"]').first().exists()
    ).toBeTruthy();
  });

  it('it shows only the created time when the updated time is missing', async () => {
    const newWrapper = mount(<UserActionTimestamp createdAt="2020-09-06T14:40:59.889Z" />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });

    expect(
      newWrapper
        .find('[data-test-subj="user-action-title-creation-relative-time"]')
        .first()
        .exists()
    ).toBeTruthy();
    expect(
      newWrapper.find('[data-test-subj="user-action-title-edited-relative-time"]').first().exists()
    ).toBeFalsy();
  });

  it('it shows the timestamp correctly', async () => {
    const createdText = wrapper
      .find('[data-test-subj="user-action-title-creation-relative-time"]')
      .first()
      .text();

    const updatedText = wrapper
      .find('[data-test-subj="user-action-title-edited-relative-time"]')
      .first()
      .text();

    expect(`${createdText} (${updatedText})`).toBe('2 days ago (20 hours ago)');
  });
});
