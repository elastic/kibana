/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPageSection, EuiButton, EuiBasicTable, EuiHealth, EuiConfirmModal } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';
import { useBreadcrumb } from '../../hooks/use_breadcrumbs';
import { appPaths } from '../../utils/app_paths';
import { UserMcpApi, type UserMcpServer } from '../../../services/user_mcp/api';
import { McpServerForm } from './mcp_server_form';

/**
 * User MCP Servers Management Page
 * Allows users to configure external MCP servers in the UI
 *
 * Note: This is a basic skeleton. Full implementation would include:
 * - Create/Edit flyout with form validation
 * - Delete confirmation modal
 * - Test connection functionality with loading states
 * - Error handling and toast notifications
 * - Filtering and pagination for large lists
 */
export const McpServersPage: React.FC = () => {
  useBreadcrumb([{ text: 'MCP Servers', path: appPaths.mcpServers.list }]);

  const { http, notifications } = useKibana().services;
  const [servers, setServers] = useState<UserMcpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<UserMcpServer | null>(null);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<UserMcpServer | null>(null);

  const api = new UserMcpApi(http);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const serverList = await api.listServers();
      setServers(serverList);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: 'Failed to load MCP servers',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (params: any) => {
    try {
      if (selectedServer) {
        await api.updateServer(selectedServer.id, params);
        notifications.toasts.addSuccess({
          title: 'MCP server updated successfully',
          text: `Server "${params.name}" has been updated.`,
        });
      } else {
        await api.createServer(params);
        notifications.toasts.addSuccess({
          title: 'MCP server created successfully',
          text: `Server "${params.name}" has been created.`,
        });
      }
      await loadServers();
      setIsFlyoutVisible(false);
      setSelectedServer(null);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: selectedServer ? 'Failed to update MCP server' : 'Failed to create MCP server',
      });
      throw error; // Re-throw so form can handle it
    }
  };

  const handleDelete = async () => {
    if (!serverToDelete) return;

    try {
      await api.deleteServer(serverToDelete.id);
      notifications.toasts.addSuccess({
        title: 'MCP server deleted',
        text: `Server "${serverToDelete.name}" has been deleted.`,
      });
      await loadServers();
      setServerToDelete(null);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: 'Failed to delete MCP server',
      });
    }
  };

  const handleTest = async (server: UserMcpServer) => {
    try {
      const result = await api.testConnection(server.id);
      if (result.success) {
        notifications.toasts.addSuccess({
          title: 'Connection successful',
          text: result.message || 'Successfully connected to the MCP server.',
        });
      }
      return result;
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: 'Connection test failed',
      });
      return { success: false, error: (error as Error).message };
    }
  };

  const columns = [
    {
      field: 'enabled',
      name: 'Status',
      width: '100px',
      render: (enabled: boolean) => (
        <EuiHealth color={enabled ? 'success' : 'subdued'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </EuiHealth>
      ),
    },
    {
      field: 'name',
      name: 'Name',
    },
    {
      field: 'url',
      name: 'URL',
    },
    {
      field: 'auth_type',
      name: 'Auth Type',
      width: '150px',
      render: (authType: string) => {
        const labels: Record<string, string> = {
          none: 'None',
          apiKey: 'API Key',
          basicAuth: 'Basic Auth',
        };
        return labels[authType] || authType;
      },
    },
    {
      field: 'type',
      name: 'Transport',
      width: '100px',
    },
    {
      name: 'Actions',
      width: '150px',
      actions: [
        {
          name: 'Test',
          description: 'Test connection',
          icon: 'check',
          type: 'icon',
          onClick: (server: UserMcpServer) => handleTest(server),
        },
        {
          name: 'Edit',
          description: 'Edit server',
          icon: 'pencil',
          type: 'icon',
          onClick: (server: UserMcpServer) => {
            setSelectedServer(server);
            setIsFlyoutVisible(true);
          },
        },
        {
          name: 'Delete',
          description: 'Delete server',
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (server: UserMcpServer) => setServerToDelete(server),
        },
      ],
    },
  ];

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle="MCP Servers"
        description="Configure external Model Context Protocol servers to extend your agent's capabilities"
        rightSideItems={[
          <EuiButton
            key="add"
            fill
            iconType="plus"
            onClick={() => {
              setSelectedServer(null);
              setIsFlyoutVisible(true);
            }}
          >
            Add MCP Server
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiBasicTable
          items={servers}
          columns={columns}
          loading={loading}
          rowProps={() => ({
            style: { cursor: 'pointer' },
          })}
        />
      </KibanaPageTemplate.Section>

      {isFlyoutVisible && (
        <McpServerForm
          server={selectedServer || undefined}
          onClose={() => {
            setIsFlyoutVisible(false);
            setSelectedServer(null);
          }}
          onSave={handleSave}
          onTest={handleTest}
        />
      )}

      {serverToDelete && (
        <EuiConfirmModal
          title="Delete MCP Server"
          onCancel={() => setServerToDelete(null)}
          onConfirm={handleDelete}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <p>
            Are you sure you want to delete the MCP server <strong>{serverToDelete.name}</strong>?
          </p>
          <p>This action cannot be undone. All tools from this server will be removed.</p>
        </EuiConfirmModal>
      )}
    </KibanaPageTemplate>
  );
};
