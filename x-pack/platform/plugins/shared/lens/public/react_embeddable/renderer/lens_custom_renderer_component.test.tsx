/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { LensRendererProps } from '@kbn/lens-common';
import { getLensComponentProps } from '../mocks';
import type { LensParentApi } from './types';

let lastGetParentApi: (() => Partial<LensParentApi>) | undefined;

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: (props: { getParentApi: () => Partial<LensParentApi> }) => {
    lastGetParentApi = props.getParentApi;
    return null;
  },
}));

// Import after the mock so the component picks up the mocked EmbeddableRenderer
// eslint-disable-next-line import/order
import { LensRenderer } from './lens_custom_renderer_component';

describe('LensRenderer interactivity inheritance', () => {
  beforeEach(() => {
    lastGetParentApi = undefined;
  });

  it('forwards the parent viewMode$ and disableTriggers$ when no explicit overrides are provided', () => {
    const dashboardParentApi = {
      viewMode$: new BehaviorSubject('non-interactive'),
      disableTriggers$: new BehaviorSubject(true),
    };

    const props = getLensComponentProps({
      parentApi: dashboardParentApi,
    }) as unknown as LensRendererProps;

    render(<LensRenderer {...props} />);

    const parentApi = lastGetParentApi?.();
    expect(parentApi?.viewMode$).toBe(dashboardParentApi.viewMode$);
    expect(parentApi?.disableTriggers$).toBe(dashboardParentApi.disableTriggers$);
  });
});
