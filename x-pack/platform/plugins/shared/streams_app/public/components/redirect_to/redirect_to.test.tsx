/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RedirectTo } from '.';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';

jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_streams_app_params');

const mockReplace = jest.fn();
const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseStreamsAppParams = useStreamsAppParams as jest.MockedFunction<
  typeof useStreamsAppParams
>;

describe('RedirectTo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppRouter.mockReturnValue({
      replace: mockReplace,
    } as any);
  });

  describe('legacy route redirects', () => {
    it('redirects from /{key}/{tab} to /{key}/management/{tab} with retention tab', () => {
      // Simulate being on /logs/overview (legacy route)
      mockUseStreamsAppParams.mockReturnValue({
        path: { key: 'logs', tab: 'overview' },
        query: { rangeFrom: 'now-15m', rangeTo: 'now' },
      });

      render(<RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />);

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'retention' },
        query: { rangeFrom: 'now-15m', rangeTo: 'now' },
      });
    });

    it('redirects from /{key}/{tab} preserving query params', () => {
      // Simulate being on /logs/dashboard with time range
      mockUseStreamsAppParams.mockReturnValue({
        path: { key: 'logs.nginx', tab: 'dashboard' },
        query: { rangeFrom: 'now-1h', rangeTo: 'now' },
      });

      render(<RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />);

      expect(mockReplace).toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs.nginx', tab: 'retention' },
        query: { rangeFrom: 'now-1h', rangeTo: 'now' },
      });
    });
  });

  describe('catch-all route redirects', () => {
    it('redirects unknown deep paths to management/retention', () => {
      // Simulate being on /logs/some/unknown/path
      mockUseStreamsAppParams.mockReturnValue({
        path: { key: 'logs' },
        query: {},
      });

      render(<RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />);

      expect(mockReplace).toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'retention' },
        query: {},
      });
    });
  });

  describe('root stream detail redirect', () => {
    it('redirects from /{key} to /{key}/management/retention', () => {
      mockUseStreamsAppParams.mockReturnValue({
        path: { key: 'metrics' },
        query: { rangeFrom: 'now-24h', rangeTo: 'now' },
      });

      render(<RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />);

      expect(mockReplace).toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'metrics', tab: 'retention' },
        query: { rangeFrom: 'now-24h', rangeTo: 'now' },
      });
    });
  });

  describe('discovery redirect', () => {
    it('redirects from /_discovery to /_discovery/streams', () => {
      mockUseStreamsAppParams.mockReturnValue({
        path: {},
        query: {},
      });

      render(<RedirectTo path="/_discovery/{tab}" params={{ path: { tab: 'streams' } }} />);

      expect(mockReplace).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'streams' },
        query: {},
      });
    });
  });

  describe('children rendering', () => {
    it('renders children if provided', () => {
      mockUseStreamsAppParams.mockReturnValue({
        path: {},
        query: {},
      });

      const { getByText } = render(
        <RedirectTo path="/" params={{}}>
          <span>Loading...</span>
        </RedirectTo>
      );

      expect(getByText('Loading...')).toBeInTheDocument();
    });

    it('returns null if no children provided', () => {
      mockUseStreamsAppParams.mockReturnValue({
        path: {},
        query: {},
      });

      const { container } = render(<RedirectTo path="/" params={{}} />);

      expect(container.firstChild).toBeNull();
    });
  });
});
