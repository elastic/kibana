/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

const mockNavigateToUrl = vi.fn();

vi.mock('.', () => {
      const mocked = {
      generateReactRouterProps: ({
        to,
        navigateToUrl: nav,
      }: {
        to: string;
        navigateToUrl?: (path: string) => void;
      }) => ({
        href: `/app/content_connectors${to}`,
        onClick: (e?: { preventDefault?: () => void }) => {
          e?.preventDefault?.();
          nav?.(`/app/content_connectors${to}`);
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({
        services: { http: {}, application: { navigateToUrl: mockNavigateToUrl } },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: () => ({}),
    };
      return { ...mocked, default: mocked };
    });

import React from 'react';

import { screen, fireEvent } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import {
  EuiLinkTo,
  EuiButtonTo,
  EuiButtonEmptyTo,
  EuiButtonIconTo,
  EuiListGroupItemTo,
  EuiPanelTo,
  EuiCardTo,
} from './eui_components';

describe('React Router EUI component helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an EuiLink', () => {
    renderWithKibanaRenderContext(<EuiLinkTo to="/" />);

    expect(screen.getByTestId('contentConnectorsEuiLinkToLink')).toBeInTheDocument();
  });

  it('renders an EuiButton', () => {
    renderWithKibanaRenderContext(<EuiButtonTo to="/" />);

    expect(screen.getByTestId('contentConnectorsEuiButtonToButton')).toBeInTheDocument();
  });

  it('renders an EuiButtonEmpty', () => {
    renderWithKibanaRenderContext(<EuiButtonEmptyTo to="/" />);

    expect(screen.getByTestId('contentConnectorsEuiButtonEmptyToButton')).toBeInTheDocument();
  });

  it('renders an EuiButtonIconTo', () => {
    renderWithKibanaRenderContext(<EuiButtonIconTo iconType="pencil" to="/" />);

    expect(screen.getByTestId('contentConnectorsEuiButtonIconToButton')).toBeInTheDocument();
  });

  it('renders an EuiListGroupItem', () => {
    renderWithKibanaRenderContext(<EuiListGroupItemTo to="/" label="foo" />);

    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  it('renders an EuiPanel', () => {
    const { container } = renderWithKibanaRenderContext(<EuiPanelTo to="/" paddingSize="l" />);

    expect(container.querySelector('.euiPanel')).toBeInTheDocument();
  });

  it('renders an EuiCard', () => {
    renderWithKibanaRenderContext(<EuiCardTo to="/" title="test" description="" />);

    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('passes down all ...rest props', () => {
    renderWithKibanaRenderContext(<EuiLinkTo to="/" data-test-subj="test" external />);

    // data-test-subj overrides the default on EuiLink — confirms ...rest is forwarded
    expect(screen.getByTestId('test')).toBeInTheDocument();
  });

  it('renders with generated href and onClick props', () => {
    renderWithKibanaRenderContext(<EuiLinkTo to="/hello/world" />);

    const link = screen.getByTestId('contentConnectorsEuiLinkToLink');
    expect(link).toHaveAttribute('href', '/app/content_connectors/hello/world');

    fireEvent.click(link);
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/content_connectors/hello/world');
  });
});
