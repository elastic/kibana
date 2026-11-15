/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { copyToClipboard } from '@elastic/eui';
import { TestProviders } from '../../../common/mock';
import { mockCase, mockObservables } from '../../../containers/mock';
import type { ObservableFlyoutPanelProps } from './use_observable_flyout_api';
import { useObservableFlyoutApi } from './use_observable_flyout_api';
import { OBSERVABLE_FLYOUT_HISTORY_KEY } from './constants';

jest.mock('./main', () => ({
  ObservableFlyout: ({ observable, caseData }: ObservableFlyoutPanelProps) => {
    // Reads the Cases context, which only the re-established providers can give it.
    const { useCasesContext } = jest.requireActual('../../cases_context/use_cases_context');
    const { owner }: { owner: string[] } = useCasesContext();
    return (
      <div data-test-subj="mock-observable-flyout">
        {`${observable.value} ${caseData.id} ${owner.join(',')}`}
      </div>
    );
  },
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn().mockReturnValue(true),
}));

jest.mock('./tools/cases', () => ({
  ObservableCasesTool: () => <div data-test-subj="mock-observable-cases-tool" />,
}));

const params = {
  observable: { ...mockObservables[0], metadata: { triage: 'confirmed' } },
  caseData: { ...mockCase, id: 'case-1', owner: 'securitySolution' },
  typeLabel: 'IPv4',
};

describe('useObservableFlyoutApi', () => {
  const coreStart = coreMock.createStart();
  const openFlyoutTemplate = jest.mocked(coreStart.overlays.openFlyoutTemplate);
  jest
    .mocked(coreStart.application.getUrlForApp)
    .mockImplementation((appId, options) => `/app/${appId}${options?.path ?? ''}`);
  const wrapper = ({ children }: PropsWithChildren) => (
    <TestProviders coreStart={coreStart}>{children}</TestProviders>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the observable as a new session in the observable history group', () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });

    result.current.openObservableFlyout(params);

    expect(openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        session: 'start',
        historyKey: OBSERVABLE_FLYOUT_HISTORY_KEY,
        type: 'overlay',
        size: 's',
        ownFocus: false,
        resizable: true,
        flyoutMenuProps: expect.objectContaining({ title: 'Observable: 127.0.0.1' }),
        'data-test-subj': 'cases-observable-flyout',
      }),
      expect.any(Function)
    );
  });

  it('opens the cases tool wider, in the same history group so it shows Back', () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });

    result.current.openObservableCases(params);

    expect(openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        session: 'start',
        historyKey: OBSERVABLE_FLYOUT_HISTORY_KEY,
        size: 'm',
        flyoutMenuProps: { title: 'Cases with this observable: 127.0.0.1' },
        'data-test-subj': 'cases-observable-cases-tool',
      }),
      expect.any(Function)
    );
  });

  it('puts a copy link action next to the close button, linking to this observable', () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });
    result.current.openObservableFlyout(params);
    const [[{ flyoutMenuProps }]] = openFlyoutTemplate.mock.calls;
    const [linkAction] = flyoutMenuProps?.trailingActions ?? [];

    expect(linkAction).toEqual(
      expect.objectContaining({
        iconType: 'link',
        'aria-label': 'Copy link to this observable',
        'data-test-subj': 'cases-observable-flyout-copy-link',
      })
    );

    linkAction.onClick?.({} as React.MouseEvent<HTMLElement>);

    const [[url]] = jest.mocked(copyToClipboard).mock.calls;
    const linkParams = new URLSearchParams(url.slice(url.indexOf('?')));
    expect(url).toContain('case-1');
    expect(linkParams.get('tabId')).toBe('observables');
    expect(linkParams.get('observableTypeKey')).toBe(params.observable.typeKey);
    expect(linkParams.get('observableValue')).toBe('127.0.0.1');
  });

  it('gives the cases tool no copy link action', () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });
    result.current.openObservableCases(params);
    const [[{ flyoutMenuProps }]] = openFlyoutTemplate.mock.calls;

    expect(flyoutMenuProps?.trailingActions).toBeUndefined();
  });

  it('renders the panel with the opener context in its own React root', async () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });
    result.current.openObservableFlyout(params);
    const Content = openFlyoutTemplate.mock.calls[0][1] as ComponentType<{
      onClose: () => void;
    }>;

    // Rendered outside the test providers, as core renders it.
    render(<Content onClose={jest.fn()} />);

    expect(await screen.findByTestId('mock-observable-flyout')).toHaveTextContent(
      '127.0.0.1 case-1 securitySolution'
    );
  });

  it('renders the cases tool', async () => {
    const { result } = renderHook(() => useObservableFlyoutApi(), { wrapper });
    result.current.openObservableCases(params);
    const Content = openFlyoutTemplate.mock.calls[0][1] as ComponentType<{
      onClose: () => void;
    }>;

    render(<Content onClose={jest.fn()} />);

    expect(await screen.findByTestId('mock-observable-cases-tool')).toBeInTheDocument();
  });
});
