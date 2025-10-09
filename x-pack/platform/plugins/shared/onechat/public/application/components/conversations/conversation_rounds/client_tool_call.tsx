/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useClientTools } from '../../../context/client_tools_context';

export interface ClientToolCallAttributes {
  id?: string;
  params?: string;
}

export const ClientToolCall: React.FC<ClientToolCallAttributes> = ({ id, params }) => {
  const clientTools = useClientTools();
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeToolCall = useCallback(async () => {
    if (!id || !clientTools || executed || isExecuting) return;

    const tool = clientTools[id];
    if (!tool) {
      setError(
        i18n.translate('xpack.onechat.clientToolCall.toolNotFound', {
          defaultMessage: 'Tool "{toolId}" not found',
          values: { toolId: id },
        })
      );
      return;
    }

    setIsExecuting(true);
    try {
      // Parse params
      let parsedParams = {};
      if (params) {
        try {
          parsedParams = JSON.parse(params);
        } catch (e) {
          throw new Error(
            i18n.translate('xpack.onechat.clientToolCall.invalidParams', {
              defaultMessage: 'Invalid parameters format',
            })
          );
        }
      }

      // Execute the tool
      await tool.fn(parsedParams);
      setExecuted(true);
      setError(null);
    } catch (e) {
      setError(
        i18n.translate('xpack.onechat.clientToolCall.executionError', {
          defaultMessage: 'Error executing tool: {error}',
          values: { error: e instanceof Error ? e.message : String(e) },
        })
      );
    } finally {
      setIsExecuting(false);
    }
  }, [id, params, clientTools, executed, isExecuting]);

  // Auto-execute on mount
  useEffect(() => {
    executeToolCall();
  }, [executeToolCall]);

  if (!id) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.onechat.clientToolCall.missingId', {
          defaultMessage: 'Client tool call missing id attribute',
        })}
        color="danger"
        iconType="error"
      />
    );
  }

  if (error) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.onechat.clientToolCall.errorTitle', {
            defaultMessage: 'Tool execution failed',
          })}
          color="danger"
          iconType="error"
        >
          <p>{error}</p>
          <EuiButton
            size="s"
            color="danger"
            onClick={executeToolCall}
            isLoading={isExecuting}
            disabled={isExecuting}
          >
            {i18n.translate('xpack.onechat.clientToolCall.retry', {
              defaultMessage: 'Retry',
            })}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  if (executed) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.onechat.clientToolCall.executed', {
            defaultMessage: 'Tool "{toolId}" executed successfully',
            values: { toolId: id },
          })}
          color="success"
          iconType="check"
        />
        <EuiSpacer size="m" />
      </>
    );
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.onechat.clientToolCall.executing', {
          defaultMessage: 'Executing tool "{toolId}"...',
          values: { toolId: id },
        })}
        color="primary"
        iconType="iInCircle"
      />
      <EuiSpacer size="m" />
    </>
  );
};
