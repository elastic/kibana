/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchDefaultEmailAddress } from './fetch_default_email_address';
import { uiSettingsServiceMock } from '../../../../../../../src/core/server/mocks';

describe('fetchDefaultEmailAddress', () => {
  it('get the email address', async () => {
    const email = 'test@test.com';
    const uiSettingsClient = uiSettingsServiceMock.createClient();
    uiSettingsClient.get.mockResolvedValue(email);
    const result = await fetchDefaultEmailAddress(uiSettingsClient);
    expect(result).toBe(email);
  });
});
