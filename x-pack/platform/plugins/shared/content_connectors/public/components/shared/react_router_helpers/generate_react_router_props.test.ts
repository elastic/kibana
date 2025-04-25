/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistory } from '../../../__mocks__/react_router';
import { generateReactRouterProps } from '.';
import { httpServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';

describe('generateReactRouterProps', () => {
  const history = { ...scopedHistoryMock.create(), ...mockHistory };
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates React-Router-friendly href and onClick props', () => {
    expect(generateReactRouterProps({ http, to: '/hello/world', history })).toEqual({
      href: '/app/content_connectors/hello/world',
      onClick: expect.any(Function),
    });
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  it('renders with the correct non-basenamed href when shouldNotCreateHref is passed', () => {
    expect(
      generateReactRouterProps({ http, to: '/hello/world', shouldNotCreateHref: true, history })
    ).toEqual({
      href: '/hello/world',
      onClick: expect.any(Function),
    });
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history for internal links', () => {
      const navigateToUrl = jest.fn();
      const mockEvent = {
        button: 0,
        target: { getAttribute: () => '_self' },
        preventDefault: jest.fn(),
      } as any;

      const { onClick } = generateReactRouterProps({ http, to: '/test', history, navigateToUrl });
      onClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('/app/content_connectors/test', {
        shouldNotCreateHref: false,
        shouldNotPrepend: false,
      });
    });

    it('prevents default navigation and uses React Router history for cross-app links', () => {
      const mockEvent = {
        button: 0,
        target: { getAttribute: () => '_self' },
        preventDefault: jest.fn(),
      } as any;
      const navigateToUrl = jest.fn();
      const { onClick } = generateReactRouterProps({
        http,
        to: '/app/content_connectors/test',
        shouldNotCreateHref: true,
        history,
        navigateToUrl,
      });
      onClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(navigateToUrl).toHaveBeenCalledWith('/app/content_connectors/test', {
        shouldNotCreateHref: true,
        shouldNotPrepend: false,
      });
    });

    it('does not prevent default browser behavior on new tab/window clicks', () => {
      const navigateToUrl = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        shiftKey: true,
        target: { getAttribute: () => '_blank' },
      } as any;

      const { onClick } = generateReactRouterProps({ http, to: '/test', history });
      onClick(mockEvent);

      expect(navigateToUrl).not.toHaveBeenCalled();
    });

    it('calls inherited onClick actions in addition to default navigation', () => {
      const mockEvent = { preventDefault: jest.fn() } as any;
      const customOnClick = jest.fn(); // Can be anything from telemetry to a state reset

      const { onClick } = generateReactRouterProps({
        http,
        to: '/test',
        onClick: customOnClick,
        history,
      });
      onClick(mockEvent);

      expect(customOnClick).toHaveBeenCalled();
    });
  });
});
