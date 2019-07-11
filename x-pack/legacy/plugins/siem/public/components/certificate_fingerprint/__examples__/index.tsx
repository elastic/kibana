/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TestProviders } from '../../../mock';
import { CertificateFingerprint } from '..';

storiesOf('components/CertificateFingerprint', module).add('example', () => (
  <TestProviders>
    <CertificateFingerprint
      eventId="123"
      certificateType="client"
      contextId="456"
      fieldName="test"
      value="VALUE"
    />
  </TestProviders>
));
