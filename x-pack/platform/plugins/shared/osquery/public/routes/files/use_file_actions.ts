/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS } from '../../../common/constants';

interface GetFileBody {
  endpoint_ids: string[];
  parameters: { path: string };
  comment?: string;
}

interface RunScriptBody {
  endpoint_ids: string[];
  parameters: {
    // hostPath: the file path to pass to the script runner on the endpoint.
    // We use hostPath rather than raw/inline script because it delegates execution
    // to the endpoint agent without embedding an arbitrary script string in this
    // route. The Endpoint run_script action interprets hostPath as the path to a
    // pre-existing script on the host. For Files-tab v1 this is the selected file
    // path — the user confirms they want to execute it.
    hostPath: string;
  };
}

interface AuditRetrieveBody {
  agentId: string;
  endpointId: string;
  path: string;
  actionType: 'get_file' | 'run_script';
}

interface UseFileActionsParams {
  endpointId: string;
  agentId: string;
}

export const useFileActions = ({ endpointId, agentId }: UseFileActionsParams) => {
  const { http, notifications } = useKibana().services;

  const emitAuditEvent = useCallback(
    async (path: string, actionType: 'get_file' | 'run_script') => {
      try {
        await http.post('/internal/osquery/file_system/audit_retrieve', {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({
            agentId,
            endpointId,
            path,
            actionType,
          } satisfies AuditRetrieveBody),
        });
      } catch {
        // Audit failure must not surface to the user — it is a best-effort record.
      }
    },
    [http, agentId, endpointId]
  );

  const getFile = useCallback(
    async (path: string) => {
      try {
        await http.post('/api/endpoint/action/get_file', {
          body: JSON.stringify({
            endpoint_ids: [endpointId],
            parameters: { path },
          } satisfies GetFileBody),
        });

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.osquery.fileSystem.getFile.successTitle', {
            defaultMessage: 'File retrieval queued',
          }),
          text: i18n.translate('xpack.osquery.fileSystem.getFile.successText', {
            defaultMessage:
              'The get-file action has been dispatched to the endpoint. The file will appear in the response-actions detail once the agent responds. This operation is asynchronous.',
          }),
        });

        await emitAuditEvent(path, 'get_file');
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.osquery.fileSystem.getFile.errorTitle', {
            defaultMessage: 'Failed to retrieve file',
          }),
          text: error?.body?.message ?? error?.message ?? String(error),
        });
      }
    },
    [http, notifications, endpointId, emitAuditEvent]
  );

  const runScript = useCallback(
    async (path: string) => {
      try {
        await http.post('/api/endpoint/action/run_script', {
          body: JSON.stringify({
            endpoint_ids: [endpointId],
            parameters: { hostPath: path },
          } satisfies RunScriptBody),
        });

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.osquery.fileSystem.runScript.successTitle', {
            defaultMessage: 'Script execution queued',
          }),
          text: i18n.translate('xpack.osquery.fileSystem.runScript.successText', {
            defaultMessage:
              'The run-script action has been dispatched to the endpoint. Results will appear in the response-actions detail once the agent responds. This operation is asynchronous.',
          }),
        });

        await emitAuditEvent(path, 'run_script');
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.osquery.fileSystem.runScript.errorTitle', {
            defaultMessage: 'Failed to run script',
          }),
          text: error?.body?.message ?? error?.message ?? String(error),
        });
      }
    },
    [http, notifications, endpointId, emitAuditEvent]
  );

  return { getFile, runScript };
};
