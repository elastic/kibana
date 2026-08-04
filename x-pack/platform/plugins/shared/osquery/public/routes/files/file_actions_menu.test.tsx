/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { FileActionsMenu } from './file_actions_menu';
import type { FileActionsAuthz } from './use_file_actions_authz';

const mockPost = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        post: mockPost,
        get: jest.fn(),
        basePath: { prepend: (p: string) => p },
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addDanger: mockAddDanger,
          addError: jest.fn(),
          addInfo: jest.fn(),
        },
      },
    },
  }),
}));

jest.mock('../../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>
    <IntlProvider locale="en">
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    </IntlProvider>
  </EuiProvider>
);

const ENABLED_AUTHZ: FileActionsAuthz = { capability: true, license: true, rbac: true };
const NO_CAPABILITY_AUTHZ: FileActionsAuthz = { capability: false, license: true, rbac: true };
const NO_LICENSE_AUTHZ: FileActionsAuthz = { capability: true, license: false, rbac: true };
const NO_RBAC_AUTHZ: FileActionsAuthz = { capability: true, license: true, rbac: false };

const openMenu = async (path: string) => {
  const menuButton = screen.getByTestId(`fileActionsMenuButton-${path}`);
  fireEvent.click(menuButton);
  await waitFor(() => {
    expect(screen.getByTestId('fileActionGetFile')).toBeInTheDocument();
  });
};

describe('FileActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('menu rendering', () => {
    it('should render the menu trigger button', () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-1"
            path="/etc/hosts"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('fileActionsMenuButton-/etc/hosts')).toBeInTheDocument();
    });

    it('should show all three menu items on open', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-1"
            path="/etc/hosts"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/hosts');

      expect(screen.getByTestId('fileActionGetFile')).toBeInTheDocument();
      expect(screen.getByTestId('fileActionRunScript')).toBeInTheDocument();
      expect(screen.getByTestId('fileActionViewHashes')).toBeInTheDocument();
    });
  });

  describe('disabled-state tooltips', () => {
    it('should disable act-verb items and show capability tooltip on hover when capability is false', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId=""
            path="/etc/hosts"
            authz={NO_CAPABILITY_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/hosts');

      const getFileBtn = screen.getByTestId('fileActionGetFile');
      expect(getFileBtn).toBeDisabled();

      // EuiToolTip renders content into a portal on mouseOver
      fireEvent.mouseOver(getFileBtn.closest('span')!);
      await waitFor(() => {
        expect(
          screen.getByText('Elastic Defend is not installed on this host')
        ).toBeInTheDocument();
      });
    });

    it('should disable act-verb items and show license tooltip on hover when license is false', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-1"
            path="/etc/hosts"
            authz={NO_LICENSE_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/hosts');

      const getFileBtn = screen.getByTestId('fileActionGetFile');
      expect(getFileBtn).toBeDisabled();

      fireEvent.mouseOver(getFileBtn.closest('span')!);
      await waitFor(() => {
        expect(screen.getByText('Requires an Enterprise license')).toBeInTheDocument();
      });
    });

    it('should disable act-verb items and show RBAC tooltip on hover when rbac is false', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-1"
            path="/etc/hosts"
            authz={NO_RBAC_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/hosts');

      const getFileBtn = screen.getByTestId('fileActionGetFile');
      expect(getFileBtn).toBeDisabled();

      fireEvent.mouseOver(getFileBtn.closest('span')!);
      await waitFor(() => {
        expect(
          screen.getByText('You do not have permission to perform this action')
        ).toBeInTheDocument();
      });
    });
  });

  describe('get-file action', () => {
    it('should POST to the get_file route with endpointId and path', async () => {
      mockPost.mockResolvedValue({});

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/etc/passwd"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/passwd');
      await act(async () => {
        fireEvent.click(screen.getByTestId('fileActionGetFile'));
      });

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/api/endpoint/action/get_file',
          expect.objectContaining({
            body: JSON.stringify({
              endpoint_ids: ['ep-42'],
              parameters: { path: '/etc/passwd' },
            }),
          })
        );
      });
    });

    it('should show a success toast after get-file dispatch', async () => {
      mockPost.mockResolvedValue({});

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/etc/passwd"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/passwd');
      await act(async () => {
        fireEvent.click(screen.getByTestId('fileActionGetFile'));
      });

      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'File retrieval queued' })
        );
      });
    });

    it('should fire audit_retrieve call after successful get-file', async () => {
      mockPost.mockResolvedValue({});

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/etc/passwd"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/passwd');
      await act(async () => {
        fireEvent.click(screen.getByTestId('fileActionGetFile'));
      });

      await waitFor(() => {
        const auditCall = mockPost.mock.calls.find(
          ([url]: [string]) => url === '/internal/osquery/file_system/audit_retrieve'
        );
        expect(auditCall).toBeDefined();
        const [, opts] = auditCall!;
        const body = JSON.parse(opts.body);
        expect(body).toMatchObject({
          agentId: 'agent-1',
          endpointId: 'ep-42',
          path: '/etc/passwd',
          actionType: 'get_file',
        });
      });
    });

    it('should show danger toast when get-file fails', async () => {
      mockPost.mockRejectedValue({ body: { message: 'Server error' } });

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/etc/passwd"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/passwd');
      await act(async () => {
        fireEvent.click(screen.getByTestId('fileActionGetFile'));
      });

      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Failed to retrieve file' })
        );
      });
    });
  });

  describe('run-script action', () => {
    it('should open the confirmation modal on run-script click', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/tmp/script.sh"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/tmp/script.sh');
      fireEvent.click(screen.getByTestId('fileActionRunScript'));

      await waitFor(() => {
        expect(screen.getByTestId('runScriptModal')).toBeInTheDocument();
        expect(screen.getByTestId('runScriptPath')).toHaveTextContent('/tmp/script.sh');
      });
    });

    it('should POST to run_script with hostPath on confirm', async () => {
      mockPost.mockResolvedValue({});

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/tmp/script.sh"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/tmp/script.sh');
      fireEvent.click(screen.getByTestId('fileActionRunScript'));

      await waitFor(() => {
        expect(screen.getByTestId('runScriptModal')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('runScriptConfirm'));
      });

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/api/endpoint/action/run_script',
          expect.objectContaining({
            body: JSON.stringify({
              endpoint_ids: ['ep-42'],
              parameters: { hostPath: '/tmp/script.sh' },
            }),
          })
        );
      });
    });

    it('should fire audit_retrieve call after successful run-script', async () => {
      mockPost.mockResolvedValue({});

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/tmp/script.sh"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/tmp/script.sh');
      fireEvent.click(screen.getByTestId('fileActionRunScript'));

      await waitFor(() => {
        expect(screen.getByTestId('runScriptModal')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('runScriptConfirm'));
      });

      await waitFor(() => {
        const auditCall = mockPost.mock.calls.find(
          ([url]: [string]) => url === '/internal/osquery/file_system/audit_retrieve'
        );
        expect(auditCall).toBeDefined();
        const [, opts] = auditCall!;
        const body = JSON.parse(opts.body);
        expect(body).toMatchObject({ actionType: 'run_script', path: '/tmp/script.sh' });
      });
    });

    it('should close the modal and not dispatch on cancel', async () => {
      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/tmp/script.sh"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/tmp/script.sh');
      fireEvent.click(screen.getByTestId('fileActionRunScript'));

      await waitFor(() => {
        expect(screen.getByTestId('runScriptModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('runScriptCancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('runScriptModal')).not.toBeInTheDocument();
      });

      expect(mockPost).not.toHaveBeenCalledWith(
        '/api/endpoint/action/run_script',
        expect.anything()
      );
    });
  });

  describe('view hashes action', () => {
    it('should open the hashes flyout on click', async () => {
      mockPost.mockResolvedValue({ data: { action_id: 'hash-action-1' } });

      render(
        <Wrapper>
          <FileActionsMenu
            agentId="agent-1"
            endpointId="ep-42"
            path="/etc/passwd"
            authz={ENABLED_AUTHZ}
          />
        </Wrapper>
      );

      await openMenu('/etc/passwd');
      fireEvent.click(screen.getByTestId('fileActionViewHashes'));

      await waitFor(() => {
        expect(screen.getByTestId('fileHashesFlyout')).toBeInTheDocument();
      });
    });
  });
});
