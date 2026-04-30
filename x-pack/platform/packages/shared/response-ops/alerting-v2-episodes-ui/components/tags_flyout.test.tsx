/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { QueryClient } from '@kbn/react-query';
import { openTagsFlyout } from './tags_flyout';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: unknown) => (element: HTMLElement) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRoot } = require('react-dom/client');
    const root = createRoot(element);
    root.render(node);
    return () => root.unmount();
  },
}));

jest.mock('./actions/edit_episode_tags_flyout', () => ({
  AlertEpisodeTagsFlyout: ({
    currentTags,
    onSave,
    onClose,
  }: {
    currentTags: string[];
    onSave: (tags: string[]) => void;
    onClose: () => void;
  }) => (
    <div data-test-subj="tagsFlyout">
      <span data-test-subj="tagsFlyoutCurrentTags">{JSON.stringify(currentTags)}</span>
      <button data-test-subj="tagsFlyoutConfirm" onClick={() => onSave(['tag-a', 'tag-b'])}>
        Save
      </button>
      <button data-test-subj="tagsFlyoutCancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  ),
}));

const mockOverlays = overlayServiceMock.createStartContract();
const mockRendering = renderingServiceMock.create();
const mockHttp = httpServiceMock.createStartContract();
const mockExpressions = {} as any;
const mockQueryClient = new QueryClient();

beforeEach(() => {
  jest.clearAllMocks();

  mockOverlays.openFlyout.mockImplementation((mount: any) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const unmount = mount(div);
    const close = jest.fn(() => {
      act(() => {
        if (typeof unmount === 'function') {
          unmount();
        }
        div.remove();
      });
    });
    return { close, onClose: Promise.resolve() } as any;
  });
});

describe('openTagsFlyout', () => {
  it('resolves with the confirmed tags on save', async () => {
    const promise = openTagsFlyout(mockOverlays, mockRendering, ['initial-tag'], {
      http: mockHttp,
      expressions: mockExpressions,
      queryClient: mockQueryClient,
    });

    await waitFor(() => {
      expect(screen.getByTestId('tagsFlyout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tagsFlyoutConfirm'));

    await expect(promise).resolves.toEqual(['tag-a', 'tag-b']);
  });

  it('resolves with undefined on cancel', async () => {
    const promise = openTagsFlyout(mockOverlays, mockRendering, ['initial-tag'], {
      http: mockHttp,
      expressions: mockExpressions,
      queryClient: mockQueryClient,
    });

    await waitFor(() => {
      expect(screen.getByTestId('tagsFlyout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tagsFlyoutCancel'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('passes currentTags through to the inner editor', async () => {
    openTagsFlyout(mockOverlays, mockRendering, ['foo', 'bar'], {
      http: mockHttp,
      expressions: mockExpressions,
      queryClient: mockQueryClient,
    });

    await waitFor(() => {
      expect(screen.getByTestId('tagsFlyoutCurrentTags')).toBeInTheDocument();
    });

    expect(screen.getByTestId('tagsFlyoutCurrentTags')).toHaveTextContent(
      JSON.stringify(['foo', 'bar'])
    );
  });
});
