/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { TestProviders } from '../../mock';
import { PreferenceFormattedBytes } from '../formatted_bytes';
import { useMountAppended } from '../../utils/use_mount_appended';

import { Bytes } from '.';

describe('Bytes', () => {
  const mount = useMountAppended();

  test('it renders the expected formatted bytes', () => {
    const wrapper = mount(
      <TestProviders>
        <Bytes contextId="test" eventId="abc" fieldName="network.bytes" value={`1234567`} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(PreferenceFormattedBytes)
        .first()
        .text()
    ).toEqual('1.2MB');
  });
});
