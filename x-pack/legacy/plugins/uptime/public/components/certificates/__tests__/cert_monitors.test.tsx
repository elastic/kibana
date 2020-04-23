/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CertMonitors } from '../cert_monitors';
import { renderWithRouter, shallowWithRouter } from '../../../lib';

describe('CertMonitors', () => {
  it('shallow renders expected elements for valid props', () => {
    const certMons = [
      { name: '', id: 'bad-ssl-dashboard' },
      { name: 'elastic', id: 'elastic-co' },
      { name: '', id: 'extended-validation' },
    ];
    expect(shallowWithRouter(<CertMonitors monitors={certMons} />)).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    const certMons = [
      { name: '', id: 'bad-ssl-dashboard' },
      { name: 'elastic', id: 'elastic-co' },
      { name: '', id: 'extended-validation' },
    ];
    expect(renderWithRouter(<CertMonitors monitors={certMons} />)).toMatchSnapshot();
  });
});
