/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCustomContentHtml } from './use_custom_content_html';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { CustomContentComponent } from './custom_content_component';
import type { CustomContentRendererServices } from './types';

jest.mock('./use_custom_content_html', () => ({ useCustomContentHtml: jest.fn() }));

const mockUseCustomContentHtml = useCustomContentHtml as jest.MockedFunction<
  typeof useCustomContentHtml
>;

const defaultProps = {
  services: {} as CustomContentRendererServices,
  embeddableId: 'panel-1',
  esqlQueries: [],
  timeRange: undefined,
  generationVersion: 0,
  savedTemplate: '<p>hi</p>',
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  esqlVariables: undefined,
  previewHtml: null,
  onLoadingChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCustomContentHtml.mockReturnValue({
    html: '<p>hi</p>',
    columns: new Set<string>(),
    isLoading: false,
    error: undefined,
    noContent: false,
  });
});

describe('CustomContentComponent', () => {
  // Screenshotting waits for `[data-shared-item]` to reach the dashboard's panel count before
  // capturing; without it a report waits the full render timeout on every export.
  it('marks its root as a shared item so reporting can count it', () => {
    const { container } = render(<CustomContentComponent {...defaultProps} />);
    expect(container.querySelector('[data-shared-item]')).not.toBeNull();
  });

  it('keeps a 200px floor on the panel and its iframe container by default', () => {
    const { container } = render(<CustomContentComponent {...defaultProps} />);
    const root = container.querySelector('[data-shared-item]');
    expect(root).toHaveStyle({ minHeight: '200px' });
    expect(container.querySelector('iframe')?.parentElement).toHaveStyle({ minHeight: '200px' });
  });

  it('lets the host lower the floor on the panel and its iframe container', () => {
    const { container } = render(<CustomContentComponent {...defaultProps} minHeight={0} />);
    const root = container.querySelector('[data-shared-item]');
    expect(root).toHaveStyle({ minHeight: '0' });
    expect(container.querySelector('iframe')?.parentElement).toHaveStyle({ minHeight: '0' });
  });

  it('reports loading state to the panel', () => {
    const onLoadingChange = jest.fn();
    mockUseCustomContentHtml.mockReturnValue({
      html: '',
      columns: new Set<string>(),
      isLoading: true,
      error: undefined,
      noContent: false,
    });

    render(<CustomContentComponent {...defaultProps} onLoadingChange={onLoadingChange} />);

    expect(onLoadingChange).toHaveBeenCalledWith(true);
  });

  it('sandboxes the iframe: user-initiated top navigation and same-origin, never scripts', () => {
    const { container } = render(<CustomContentComponent {...defaultProps} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const tokens = iframe!.getAttribute('sandbox')!.split(' ');
    expect(tokens.sort()).toEqual(['allow-same-origin', 'allow-top-navigation-by-user-activation']);
  });

  describe('interactions', () => {
    const columns = new Set(['host.name']);
    const FILTER_HOST = {
      'data-cc-action': 'filter',
      'data-cc-field': 'host.name',
      'data-cc-value': 'a',
    };

    const mountWithColumns = (onInteraction?: jest.Mock, props = {}) => {
      mockUseCustomContentHtml.mockReturnValue({
        html: '<button>x</button>',
        columns,
        isLoading: false,
        error: undefined,
        noContent: false,
      });
      const view = render(
        <CustomContentComponent {...defaultProps} onInteraction={onInteraction} {...props} />
      );
      const iframe = view.container.querySelector('iframe')!;
      return { iframe, ...view };
    };

    // jsdom has no user input and its `isTrusted` cannot be forged, so the click listener is
    // captured as the component registers it and called with the event a browser would build.
    const clickInFrame = (
      iframe: HTMLIFrameElement,
      attributes: Record<string, string>,
      isTrusted = true
    ) => {
      const frameDocument = iframe.contentDocument!;
      // Built with the DOM API: the attributes are test input, not markup to parse.
      const button = frameDocument.createElement('button');
      button.id = 'b';
      Object.entries(attributes).forEach(([name, value]) => button.setAttribute(name, value));
      frameDocument.body.replaceChildren(button);
      const addEventListener = jest.spyOn(EventTarget.prototype, 'addEventListener');
      fireEvent.load(iframe);
      const clickCall = addEventListener.mock.calls.findIndex(
        ([type], index) =>
          type === 'click' && addEventListener.mock.contexts[index] === frameDocument
      );
      const [, listener] = addEventListener.mock.calls[clickCall];
      addEventListener.mockRestore();
      (listener as (event: Pick<MouseEvent, 'isTrusted' | 'target'>) => void)({
        isTrusted,
        target: frameDocument.getElementById('b'),
      });
    };

    it('attaches no listener when the host does not listen', () => {
      const addEventListener = jest.spyOn(EventTarget.prototype, 'addEventListener');
      const { iframe } = mountWithColumns(undefined);
      iframe.contentDocument!.body.replaceChildren(iframe.contentDocument!.createElement('button'));
      fireEvent.load(iframe);
      const clickListeners = addEventListener.mock.calls.filter(
        ([type], index) =>
          type === 'click' && addEventListener.mock.contexts[index] === iframe.contentDocument
      );
      addEventListener.mockRestore();
      expect(clickListeners).toHaveLength(0);
    });

    it('reports a click on an element that declares a valid filter', () => {
      const onInteraction = jest.fn();
      const { iframe } = mountWithColumns(onInteraction);
      clickInFrame(iframe, FILTER_HOST);
      expect(onInteraction).toHaveBeenCalledWith({
        action: 'filter',
        field: 'host.name',
        value: 'a',
        negate: false,
      });
    });

    it('ignores an action the host did not list as supported', () => {
      const onInteraction = jest.fn();
      const { iframe } = mountWithColumns(onInteraction, { interactionActions: [] });
      clickInFrame(iframe, FILTER_HOST);
      expect(onInteraction).not.toHaveBeenCalled();
    });

    it('ignores a click that names a column the query did not return', () => {
      const onInteraction = jest.fn();
      const { iframe } = mountWithColumns(onInteraction);
      clickInFrame(iframe, { ...FILTER_HOST, 'data-cc-field': 'user.id' });
      expect(onInteraction).not.toHaveBeenCalled();
    });

    it('ignores a click that is not from the user', () => {
      const onInteraction = jest.fn();
      const { iframe } = mountWithColumns(onInteraction);
      clickInFrame(iframe, FILTER_HOST, false);
      expect(onInteraction).not.toHaveBeenCalled();
    });

    it('never offers interactions in a non-interactive view', () => {
      const { iframe } = mountWithColumns(jest.fn(), { isInteractive: false });
      expect(iframe.getAttribute('sandbox')).toBe('');
    });
  });

  it('blocks all navigation from the iframe in a non-interactive view', () => {
    const { container } = render(
      <CustomContentComponent {...defaultProps} isInteractive={false} />
    );

    expect(container.querySelector('iframe')!.getAttribute('sandbox')).toBe('');
  });

  it('passes the interactive flag to the HTML hook', () => {
    render(<CustomContentComponent {...defaultProps} isInteractive={false} />);

    expect(mockUseCustomContentHtml).toHaveBeenCalledWith(
      expect.objectContaining({ isInteractive: false })
    );
  });

  it('passes the request adapter to the HTML hook', () => {
    const requestAdapter = new RequestAdapter();

    render(<CustomContentComponent {...defaultProps} requestAdapter={requestAdapter} />);

    expect(mockUseCustomContentHtml).toHaveBeenCalledWith(
      expect.objectContaining({ requestAdapter })
    );
  });

  it('keeps the preview iframe fully sandboxed so a click cannot navigate away from the editor', () => {
    mockUseCustomContentHtml.mockReturnValue({
      html: '',
      columns: new Set<string>(),
      isLoading: false,
      error: undefined,
      noContent: false,
    });
    const { container } = render(
      <CustomContentComponent {...defaultProps} previewHtml="<p>preview</p>" />
    );

    expect(container.querySelector('iframe')!.getAttribute('sandbox')).toBe('');
  });

  it('shows the generating prompt while the agent is working', () => {
    render(<CustomContentComponent {...defaultProps} isGenerating />);

    expect(screen.getByTestId('customContentGeneratingPrompt')).toBeInTheDocument();
    expect(screen.getByText('Generating your panel...')).toBeInTheDocument();
  });
});
