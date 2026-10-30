/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { uiPrivileges } from '../../../common/features';
import { useCanWriteContextEngine } from './use_can_write_context_engine';

const renderWithKibana = (core: ReturnType<typeof coreMock.createStart>) => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services: core }, children);

  return renderHook(useCanWriteContextEngine, { wrapper });
};

describe('useCanWriteContextEngine', () => {
  it('returns true when the write capability is true', () => {
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      contextEngine: {
        [uiPrivileges.write]: true,
      },
    };

    const { result } = renderWithKibana(core);

    expect(result.current).toBe(true);
  });

  it('returns false when the write capability is explicitly false', () => {
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      contextEngine: {
        [uiPrivileges.write]: false,
      },
    };

    const { result } = renderWithKibana(core);

    expect(result.current).toBe(false);
  });

  it('returns false when the contextEngine capabilities are missing', () => {
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
    };

    const { result } = renderWithKibana(core);

    expect(result.current).toBe(false);
  });
});
