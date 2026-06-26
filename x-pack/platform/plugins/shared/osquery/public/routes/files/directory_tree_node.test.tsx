/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { DirectoryTreeNode } from './directory_tree_node';
import type { TreeNode } from './directory_tree_node';

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        post: mockPost,
        get: mockGet,
        basePath: { prepend: (p: string) => p },
      },
      notifications: {
        toasts: { addDanger: jest.fn(), addError: jest.fn() },
      },
    },
  }),
}));

jest.mock('../../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

const Wrapper: React.FC<{ children: React.ReactNode; queryClient?: QueryClient }> = ({
  children,
  queryClient,
}) => (
  <EuiProvider>
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient ?? createTestQueryClient()}>
        {children}
      </QueryClientProvider>
    </IntlProvider>
  </EuiProvider>
);

const makeDirectoryNode = (path: string, filename?: string): TreeNode => ({
  path,
  filename: filename ?? path.split('/').pop() ?? path,
  isDirectory: true,
});

const makeFileNode = (path: string, filename?: string): TreeNode => ({
  path,
  filename: filename ?? path.split('/').pop() ?? path,
  isDirectory: false,
});

// Osquery indexes results under the INNER per-query action id, surfaced by the
// details endpoint. Tests set `resultsPayload` (the `/results/` body) and the
// URL-aware mock below answers the details poll with a completed inner query.
const INNER_ACTION_ID = 'inner-action-id';
let resultsPayload: { data: { total: number; edges: unknown[] } };

const detailsResponse = (innerActionId = INNER_ACTION_ID) => ({
  data: {
    action_id: 'outer-action-id',
    status: 'completed',
    queries: [{ action_id: innerActionId, status: 'completed', responded: 1 }],
  },
});

const installGetRouter = () => {
  mockGet.mockImplementation((url: string) => {
    // Details endpoint: `/api/osquery/live_queries/{outer}` (no `/results/`).
    if (url.includes('/results/')) {
      return Promise.resolve(resultsPayload);
    }

    return Promise.resolve(detailsResponse());
  });
};

describe('DirectoryTreeNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultsPayload = { data: { total: 0, edges: [] } };
    installGetRouter();
  });

  describe('file node rendering', () => {
    it('should render a file node with document icon and filename', () => {
      const node = makeFileNode('/home/user/readme.txt');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      expect(screen.getByText('readme.txt')).toBeInTheDocument();
    });

    it('should not render an expand toggle (file nodes are leaves)', () => {
      const node = makeFileNode('/home/user/readme.txt');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      // A file node exposes the per-file actions menu but never an expand
      // toggle (no directory row to open).
      expect(screen.queryByTestId('directoryNode-/home/user/readme.txt')).not.toBeInTheDocument();
    });
  });

  describe('directory node expansion', () => {
    it('should dispatch list query when directory is expanded', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-123' } });
      resultsPayload = { data: { total: 0, edges: [] } };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      const dirButton = screen.getByRole('button');
      fireEvent.click(dirButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/internal/osquery/file_system/list',
          expect.objectContaining({
            body: JSON.stringify({ agentId: 'agent-1', path: '/home/user' }),
          })
        );
      });
    });

    it('should fetch results using the inner per-query action id, not the outer live-query id', async () => {
      // Regression guard: osquery indexes results under the INNER per-query
      // action id (from the details endpoint), which differs from the outer
      // live-query id returned by dispatch. Using the outer id for the results
      // segment silently returns zero rows.
      mockPost.mockResolvedValue({ data: { action_id: 'outer-action-id' } });
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/results/')) {
          return Promise.resolve({
            data: {
              total: 1,
              edges: [
                {
                  fields: {
                    'osquery.path': ['/home/user/docs'],
                    'osquery.filename': ['docs'],
                    'osquery.type': ['directory'],
                  },
                },
              ],
            },
          });
        }

        return Promise.resolve(detailsResponse('the-inner-id'));
      });

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('docs')).toBeInTheDocument();
      });

      const resultsCall = mockGet.mock.calls.find(([url]) => (url as string).includes('/results/'));
      expect(resultsCall).toBeDefined();
      // Path is `/{outer}/results/{inner}` — inner id, NOT the outer id twice.
      expect(resultsCall![0]).toBe(
        '/api/osquery/live_queries/outer-action-id/results/the-inner-id'
      );
    });

    it('should show loading spinner while query is in flight', async () => {
      let resolvePost: (value: unknown) => void;
      const pendingPost = new Promise((resolve) => {
        resolvePost = resolve;
      });
      mockPost.mockReturnValue(pendingPost);

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      resolvePost!({ data: { action_id: 'action-123' } });
    });

    it('should not dispatch a new query on re-expand (cache hit)', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-abc' } });
      resultsPayload = {
        data: {
          total: 1,
          edges: [
            {
              fields: {
                'osquery.path': ['/home/user/documents'],
                'osquery.filename': ['documents'],
                'osquery.type': ['directory'],
              },
            },
          ],
        },
      };

      const queryClient = createTestQueryClient();
      const node = makeDirectoryNode('/home/user', 'user');

      render(
        <Wrapper queryClient={queryClient}>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('documents')).toBeInTheDocument();
      });

      const postCallCount = mockPost.mock.calls.length;

      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('documents')).toBeInTheDocument();
      });

      expect(mockPost.mock.calls.length).toBe(postCallCount);
    });
  });

  describe('result states', () => {
    it('should render empty state when directory has no children', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-empty' } });
      resultsPayload = { data: { total: 0, edges: [] } };

      const node = makeDirectoryNode('/tmp/empty-dir', 'empty-dir');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByTestId('directoryEmpty')).toBeInTheDocument();
      });
    });

    it('should render access-denied state for known TCC-protected macOS paths', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-denied' } });
      resultsPayload = { data: { total: 0, edges: [] } };

      const node = makeDirectoryNode(
        '/Users/johndoe/Library/Application Support',
        'Application Support'
      );
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByTestId('accessDenied')).toBeInTheDocument();
      });
    });

    it('should render error state when the query fails', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByTestId('directoryError')).toBeInTheDocument();
      });
    });

    it('should render truncated hint when the reported total exceeds the ceiling', async () => {
      const ceiling = 10000;
      // The results page-size caps the returned rows at the ceiling, so
      // truncation is driven by the reported `total`, not the rows length —
      // a few sample rows plus an over-ceiling `total` is enough.
      const edges = Array.from({ length: 3 }, (_, i) => ({
        fields: {
          'osquery.path': [`/home/user/file-${i}`],
          'osquery.filename': [`file-${i}`],
          'osquery.type': ['regular'],
        },
      }));

      mockPost.mockResolvedValue({ data: { action_id: 'action-truncated' } });
      resultsPayload = { data: { total: ceiling + 1, edges } };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId(`directoryNode-${node.path}`));

      await waitFor(() => {
        expect(screen.getByTestId('truncatedHint')).toBeInTheDocument();
      });

      expect(screen.getByText('Discover')).toBeInTheDocument();
    });

    it('should render child nodes when listing succeeds', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-ok' } });
      resultsPayload = {
        data: {
          total: 2,
          edges: [
            {
              fields: {
                'osquery.path': ['/home/user/docs'],
                'osquery.filename': ['docs'],
                'osquery.type': ['directory'],
              },
            },
            {
              fields: {
                'osquery.path': ['/home/user/notes.txt'],
                'osquery.filename': ['notes.txt'],
                'osquery.type': ['regular'],
              },
            },
          ],
        },
      };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('docs')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
      });
    });

    it('should render size and mtime on a file row', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-meta' } });
      resultsPayload = {
        data: {
          total: 1,
          edges: [
            {
              fields: {
                'osquery.path': ['/home/user/report.pdf'],
                'osquery.filename': ['report.pdf'],
                'osquery.type': ['regular'],
                'osquery.size': ['2516582'], // ~2.4 MB
                'osquery.mtime': ['1700000000'], // valid epoch seconds
              },
            },
          ],
        },
      };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('report.pdf')).toBeInTheDocument();
      });

      expect(screen.getByTestId('fileSize')).toHaveTextContent('2.4 MB');
      const mtime = screen.getByTestId('fileMtime');
      expect(mtime).toBeInTheDocument();
      expect(mtime.textContent).not.toHaveLength(0);
    });

    it('should omit size and mtime when the file reports none', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-nometa' } });
      resultsPayload = {
        data: {
          total: 1,
          edges: [
            {
              fields: {
                'osquery.path': ['/home/user/empty'],
                'osquery.filename': ['empty'],
                'osquery.type': ['regular'],
              },
            },
          ],
        },
      };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('empty')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('fileSize')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fileMtime')).not.toBeInTheDocument();
    });
  });

  describe('refresh action', () => {
    it('should invalidate cache and re-query when refresh is clicked', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'action-refresh' } });
      resultsPayload = { data: { total: 0, edges: [] } };

      const node = makeDirectoryNode('/home/user', 'user');
      render(
        <Wrapper>
          <DirectoryTreeNode agentId="agent-1" node={node} depth={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByTestId('directoryEmpty')).toBeInTheDocument();
      });

      const postCallsBefore = mockPost.mock.calls.length;

      const refreshButton = screen.getByTestId(`refreshNode-${node.path}`);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockPost.mock.calls.length).toBeGreaterThan(postCallsBefore);
      });
    });
  });
});
