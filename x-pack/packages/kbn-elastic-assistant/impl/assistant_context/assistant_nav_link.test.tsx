/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { AssistantNavLink } from './assistant_nav_link';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { ChromeNavControl } from '@kbn/core/public';
import { createHtmlPortalNode, OutPortal } from 'react-reverse-portal';
import { of } from 'rxjs';

const MockNavigationBar = OutPortal;

const mockShowAssistantOverlay = jest.fn();
const mockNavControls = chromeServiceMock.createStartContract().navControls;
const mockGetChromeStyle = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/kibana-react-plugin/public'),
    useKibana: () => ({
      services: {
        chrome: {
          getChromeStyle$: mockGetChromeStyle,
        },
      },
    }),
  };
});

describe('AssistantNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChromeStyle.mockReturnValue(of('classic'));
  });

  it('should register link in nav bar', () => {
    render(
      <AssistantNavLink
        hasAssistantPrivilege
        showAssistantOverlay={mockShowAssistantOverlay}
        navControls={mockNavControls}
      />
    );
    expect(mockNavControls.registerRight).toHaveBeenCalledTimes(1);
  });

  it('button has transparent background in project navigation', () => {
    const { result: portalNode } = renderHook(() =>
      React.useMemo(() => createHtmlPortalNode(), [])
    );

    mockGetChromeStyle.mockReturnValue(of('project'));

    mockNavControls.registerRight.mockImplementation((chromeNavControl: ChromeNavControl) => {
      chromeNavControl.mount(portalNode.current.element);
    });

    const { queryByTestId } = render(
      <>
        <MockNavigationBar node={portalNode.current} />
        <AssistantNavLink
          hasAssistantPrivilege
          showAssistantOverlay={mockShowAssistantOverlay}
          navControls={mockNavControls}
        />
      </>
    );
    expect(queryByTestId('assistantNavLink')).not.toHaveStyle(
      'background-color: rgb(204, 228, 245)'
    );
  });

  it('button has opaque background in classic navigation', () => {
    const { result: portalNode } = renderHook(() =>
      React.useMemo(() => createHtmlPortalNode(), [])
    );

    mockGetChromeStyle.mockReturnValue(of('classic'));

    mockNavControls.registerRight.mockImplementation((chromeNavControl: ChromeNavControl) => {
      chromeNavControl.mount(portalNode.current.element);
    });

    const { queryByTestId } = render(
      <>
        <MockNavigationBar node={portalNode.current} />
        <AssistantNavLink
          hasAssistantPrivilege
          showAssistantOverlay={mockShowAssistantOverlay}
          navControls={mockNavControls}
        />
      </>
    );
    expect(queryByTestId('assistantNavLink')).toHaveStyle('background-color: rgb(204, 228, 245)');
  });

  it('should render the header link text', () => {
    const { result: portalNode } = renderHook(() =>
      React.useMemo(() => createHtmlPortalNode(), [])
    );

    mockNavControls.registerRight.mockImplementation((chromeNavControl: ChromeNavControl) => {
      chromeNavControl.mount(portalNode.current.element);
    });

    const { queryByText, queryByTestId } = render(
      <>
        <MockNavigationBar node={portalNode.current} />
        <AssistantNavLink
          hasAssistantPrivilege
          showAssistantOverlay={mockShowAssistantOverlay}
          navControls={mockNavControls}
        />
      </>
    );
    expect(queryByTestId('assistantNavLink')).toBeInTheDocument();
    expect(queryByText('AI Assistant')).toBeInTheDocument();
  });

  it('should not render the header link if not authorized', () => {
    const { result: portalNode } = renderHook(() =>
      React.useMemo(() => createHtmlPortalNode(), [])
    );

    mockNavControls.registerRight.mockImplementation((chromeNavControl: ChromeNavControl) => {
      chromeNavControl.mount(portalNode.current.element);
    });

    const { queryByText, queryByTestId } = render(
      <>
        <MockNavigationBar node={portalNode.current} />
        <AssistantNavLink
          hasAssistantPrivilege={false}
          showAssistantOverlay={mockShowAssistantOverlay}
          navControls={mockNavControls}
        />
      </>
    );
    expect(queryByTestId('assistantNavLink')).not.toBeInTheDocument();
    expect(queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('should call the assistant overlay to show on click', () => {
    const { result: portalNode } = renderHook(() =>
      React.useMemo(() => createHtmlPortalNode(), [])
    );

    mockNavControls.registerRight.mockImplementation((chromeNavControl: ChromeNavControl) => {
      chromeNavControl.mount(portalNode.current.element);
    });

    const { queryByTestId } = render(
      <>
        <MockNavigationBar node={portalNode.current} />
        <AssistantNavLink
          hasAssistantPrivilege
          showAssistantOverlay={mockShowAssistantOverlay}
          navControls={mockNavControls}
        />
      </>
    );
    queryByTestId('assistantNavLink')?.click();
    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: true });
  });
});
