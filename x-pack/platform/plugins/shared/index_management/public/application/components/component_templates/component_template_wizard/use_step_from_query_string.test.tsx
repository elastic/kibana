/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useStepFromQueryString } from './use_step_from_query_string';

describe('useStepFromQueryString', () => {
  it('should return undefined if no step is set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: {
        current: { activeStep },
      },
    } = renderHook(() => useStepFromQueryString(history));

    expect(activeStep).not.toBeDefined();
  });

  it('should return the step if set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template?step=mappings');

    const {
      result: {
        current: { activeStep },
      },
    } = renderHook(() => useStepFromQueryString(history));

    expect(activeStep).toBe('mappings');
  });

  it('should not update history on step change if no step is set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: {
        current: { updateStep },
      },
    } = renderHook(() => useStepFromQueryString(history));

    updateStep('aliases');

    expect(history.location.search).toBe('');
  });

  it('should update history on step change if a step is set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template?step=mappings');

    const {
      result: {
        current: { updateStep },
      },
    } = renderHook(() => useStepFromQueryString(history));

    updateStep('aliases');
    expect(history.location.search).toBe('?step=aliases');
  });
});
