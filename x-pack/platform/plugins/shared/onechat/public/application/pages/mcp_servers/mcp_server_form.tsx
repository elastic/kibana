/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiSelect,
  EuiSwitch,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiSpacer,
  EuiAccordion,
  EuiCode,
} from '@elastic/eui';
import type {
  UserMcpServer,
  UserMcpServerCreateParams,
  UserMcpServerUpdateParams,
  AuthConfig,
} from '../../../services/user_mcp/api';

interface McpServerFormProps {
  server?: UserMcpServer;
  onClose: () => void;
  onSave: (params: UserMcpServerCreateParams | UserMcpServerUpdateParams) => Promise<void>;
  onTest?: (server: UserMcpServer) => Promise<{ success: boolean; error?: string }>;
}

interface FormData {
  name: string;
  description: string;
  enabled: boolean;
  type: 'http' | 'sse' | 'auto';
  url: string;
  auth_type: 'none' | 'apiKey' | 'basicAuth';
  auth_config: AuthConfig;
  options: {
    timeout: number;
    rejectUnauthorized: boolean;
  };
}

interface FormErrors {
  name?: string;
  url?: string;
  auth_config?: string;
}

export const McpServerForm: React.FC<McpServerFormProps> = ({
  server,
  onClose,
  onSave,
  onTest,
}) => {
  const isEdit = !!server;

  const [formData, setFormData] = useState<FormData>({
    name: server?.name || '',
    description: server?.description || '',
    enabled: server?.enabled ?? true,
    type: server?.type || 'auto',
    url: server?.url || '',
    auth_type: server?.auth_type || 'none',
    auth_config: server?.auth_config || { type: 'none' },
    options: {
      timeout: server?.options?.timeout || 30000,
      rejectUnauthorized: server?.options?.rejectUnauthorized ?? true,
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Update auth_config when auth_type changes
  useEffect(() => {
    if (formData.auth_type === 'none') {
      setFormData((prev) => ({ ...prev, auth_config: { type: 'none' } }));
    } else if (formData.auth_type === 'apiKey' && formData.auth_config.type !== 'apiKey') {
      setFormData((prev) => ({
        ...prev,
        auth_config: { type: 'apiKey', headers: { Authorization: 'Bearer ' } },
      }));
    } else if (formData.auth_type === 'basicAuth' && formData.auth_config.type !== 'basicAuth') {
      setFormData((prev) => ({
        ...prev,
        auth_config: { type: 'basicAuth', username: '', password: '' },
      }));
    }
  }, [formData.auth_type]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        const url = new URL(formData.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.url = 'URL must use http:// or https:// protocol';
        }
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (formData.auth_type === 'apiKey') {
      const headers = (formData.auth_config as any).headers;
      if (!headers || Object.keys(headers).length === 0) {
        newErrors.auth_config = 'At least one header is required for API Key authentication';
      }
    } else if (formData.auth_type === 'basicAuth') {
      const config = formData.auth_config as any;
      if (!config.username || !config.password) {
        newErrors.auth_config = 'Username and password are required for Basic Auth';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const updateParams: UserMcpServerUpdateParams = {
          name: formData.name,
          description: formData.description || undefined,
          enabled: formData.enabled,
          type: formData.type,
          url: formData.url,
          auth_type: formData.auth_type,
          auth_config: formData.auth_config,
          options: formData.options,
        };
        await onSave(updateParams);
      } else {
        const createParams: UserMcpServerCreateParams = {
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
          enabled: formData.enabled,
          type: formData.type,
          url: formData.url,
          auth_type: formData.auth_type,
          auth_config: formData.auth_config,
          options: formData.options,
        };
        await onSave(createParams);
      }
      onClose();
    } catch (error) {
      // Error handling will be done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    if (!validateForm() || !onTest) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const testServer: UserMcpServer = {
        id: server?.id || 'test-server', // Use existing ID or a placeholder for testing
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const result = await onTest(testServer);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const updateAuthHeader = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      auth_config: {
        type: 'apiKey',
        headers: {
          ...(prev.auth_config.type === 'apiKey' ? prev.auth_config.headers : {}),
          [key]: value,
        },
      },
    }));
  };

  const removeAuthHeader = (key: string) => {
    setFormData((prev) => {
      if (prev.auth_config.type !== 'apiKey') return prev;
      const { [key]: removed, ...rest } = prev.auth_config.headers;
      return {
        ...prev,
        auth_config: {
          type: 'apiKey',
          headers: rest,
        },
      };
    });
  };

  const addAuthHeader = () => {
    updateAuthHeader('', '');
  };

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{isEdit ? 'Edit MCP Server' : 'Add MCP Server'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form" onSubmit={(e) => e.preventDefault()}>
          {/* Server Name */}
          <EuiFormRow label="Name" error={errors.name} isInvalid={!!errors.name}>
            <EuiFieldText
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My MCP Server"
            />
          </EuiFormRow>

          {/* Description */}
          <EuiFormRow label="Description (optional)">
            <EuiTextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of this MCP server"
              rows={2}
            />
          </EuiFormRow>

          {/* URL */}
          <EuiFormRow label="URL" error={errors.url} isInvalid={!!errors.url}>
            <EuiFieldText
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/mcp"
            />
          </EuiFormRow>

          {/* Transport Type */}
          <EuiFormRow label="Transport Type" helpText="Auto will try HTTP first, then SSE">
            <EuiSelect
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'http' | 'sse' | 'auto' })
              }
              options={[
                { value: 'auto', text: 'Auto (Recommended)' },
                { value: 'http', text: 'HTTP Streamable' },
                { value: 'sse', text: 'Server-Sent Events (SSE)' },
              ]}
            />
          </EuiFormRow>

          {/* Authentication Type */}
          <EuiFormRow label="Authentication Type">
            <EuiSelect
              value={formData.auth_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auth_type: e.target.value as 'none' | 'apiKey' | 'basicAuth',
                })
              }
              options={[
                { value: 'none', text: 'None' },
                { value: 'apiKey', text: 'API Key (Custom Headers)' },
                { value: 'basicAuth', text: 'HTTP Basic Authentication' },
              ]}
            />
          </EuiFormRow>

          {/* API Key Headers */}
          {formData.auth_type === 'apiKey' && (
            <EuiFormRow
              label="HTTP Headers"
              helpText="Custom headers to send with each request"
              error={errors.auth_config}
              isInvalid={!!errors.auth_config}
            >
              <div>
                {formData.auth_config.type === 'apiKey' &&
                  Object.entries(formData.auth_config.headers).map(([key, value], index) => (
                    <EuiFlexGroup key={index} gutterSize="s" alignItems="center">
                      <EuiFlexItem>
                        <EuiFieldText
                          placeholder="Header name (e.g., Authorization)"
                          value={key}
                          onChange={(e) => {
                            const oldKey = key;
                            const newKey = e.target.value;
                            if (oldKey !== newKey) {
                              removeAuthHeader(oldKey);
                              updateAuthHeader(newKey, value);
                            }
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFieldText
                          placeholder="Header value (e.g., Bearer YOUR_TOKEN)"
                          value={value}
                          onChange={(e) => updateAuthHeader(key, e.target.value)}
                          type="password"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          color="danger"
                          iconType="trash"
                          onClick={() => removeAuthHeader(key)}
                        >
                          Remove
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                <EuiSpacer size="s" />
                <EuiButton size="s" onClick={addAuthHeader} iconType="plusInCircle">
                  Add Header
                </EuiButton>
              </div>
            </EuiFormRow>
          )}

          {/* Basic Auth Credentials */}
          {formData.auth_type === 'basicAuth' && formData.auth_config.type === 'basicAuth' && (
            <>
              <EuiFormRow
                label="Username"
                error={errors.auth_config}
                isInvalid={!!errors.auth_config}
              >
                <EuiFieldText
                  value={formData.auth_config.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auth_config: {
                        type: 'basicAuth',
                        username: e.target.value,
                        password: (formData.auth_config as any).password || '',
                      },
                    })
                  }
                  placeholder="username"
                />
              </EuiFormRow>
              <EuiFormRow label="Password">
                <EuiFieldText
                  value={formData.auth_config.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auth_config: {
                        type: 'basicAuth',
                        username: (formData.auth_config as any).username || '',
                        password: e.target.value,
                      },
                    })
                  }
                  type="password"
                  placeholder="password"
                />
              </EuiFormRow>
            </>
          )}

          {/* Enabled Switch */}
          <EuiFormRow>
            <EuiSwitch
              label="Enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
          </EuiFormRow>

          {/* Advanced Options */}
          <EuiSpacer size="m" />
          <EuiAccordion id="advanced-options" buttonContent="Advanced Options">
            <EuiSpacer size="s" />
            <EuiFormRow
              label="Request Timeout (ms)"
              helpText="Maximum time to wait for a response (1000-300000)"
            >
              <EuiFieldNumber
                value={formData.options.timeout}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, timeout: parseInt(e.target.value, 10) },
                  })
                }
                min={1000}
                max={300000}
                step={1000}
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiSwitch
                label="Verify SSL Certificates"
                checked={formData.options.rejectUnauthorized}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, rejectUnauthorized: e.target.checked },
                  })
                }
              />
            </EuiFormRow>
          </EuiAccordion>

          {/* Test Connection Result */}
          {testResult && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={testResult.success ? 'Connection successful' : 'Connection failed'}
                color={testResult.success ? 'success' : 'danger'}
                iconType={testResult.success ? 'check' : 'cross'}
              >
                {testResult.error && <p>{testResult.error}</p>}
              </EuiCallOut>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {isEdit && onTest && (
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={handleTest} isLoading={isTesting}>
                    Test Connection
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleSubmit} fill isLoading={isSubmitting}>
                  {isEdit ? 'Update' : 'Create'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
