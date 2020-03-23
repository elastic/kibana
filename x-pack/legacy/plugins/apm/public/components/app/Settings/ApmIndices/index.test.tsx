/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, wait } from '@testing-library/react';
import React from 'react';
import { ApmIndices } from '.';
import { MockApmPluginContextWrapper } from '../../../../utils/testHelpers';
import * as hooks from '../../../../hooks/useFetcher';

describe('ApmIndices', () => {
  it('should not get stuck in infinite loop', async () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      data: undefined,
      status: 'loading'
    });
    const { getByText } = render(
      <MockApmPluginContextWrapper>
        <ApmIndices />
      </MockApmPluginContextWrapper>
    );

    expect(getByText('Indices')).toMatchInlineSnapshot(`
      <h2
        class="euiTitle euiTitle--medium"
      >
        Indices
      </h2>
    `);

    await wait();
  });
});
