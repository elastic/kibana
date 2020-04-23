/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CertMonitors } from '../cert_monitors';
import { shallowWithRouter } from '../../../lib';
import { CertStatus } from '../cert_status';
import { CertificateSearch } from '../cert_search';

describe('CertificatesSearch', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertificateSearch setSearch={jest.fn()} />)).toMatchSnapshot();
  });
});
