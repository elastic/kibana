/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { LegacyUrlConflictInternal } from './legacy_url_conflict_internal';

const APP_ID = 'testAppId';
const PATH = 'path';

describe('LegacyUrlConflict', () => {
  const setup = async () => {
    const { getStartServices } = coreMock.createSetup();
    const startServices = coreMock.createStart();
    const subject = new BehaviorSubject<string>(`not-${APP_ID}`);
    subject.next(APP_ID); // test below asserts that the consumer received the most recent APP_ID
    startServices.application.currentAppId$ = subject;
    const application = startServices.application;
    getStartServices.mockResolvedValue([startServices, , ,]);

    const wrapper = mountWithIntl(
      <LegacyUrlConflictInternal
        getStartServices={getStartServices}
        currentObjectId={'123'}
        otherObjectId={'456'}
        otherObjectPath={PATH}
      />
    );

    // wait for wrapper to rerender
    await act(async () => {});
    wrapper.update();

    return { wrapper, application };
  };

  it('can click the "Go to other object" button', async () => {
    const { wrapper, application } = await setup();

    expect(application.navigateToApp).not.toHaveBeenCalled();

    const goToOtherButton = findTestSubject(wrapper, 'legacy-url-conflict-go-to-other-button');
    goToOtherButton.simulate('click');

    expect(application.navigateToApp).toHaveBeenCalledTimes(1);
    expect(application.navigateToApp).toHaveBeenCalledWith(APP_ID, { path: PATH });
  });

  it('can click the "Dismiss" button', async () => {
    const { wrapper } = await setup();

    expect(wrapper.find(EuiCallOut)).toHaveLength(1); // callout is visible

    const dismissButton = findTestSubject(wrapper, 'legacy-url-conflict-dismiss-button');
    dismissButton.simulate('click');
    wrapper.update();

    expect(wrapper.find(EuiCallOut)).toHaveLength(0); // callout is not visible
  });
});
