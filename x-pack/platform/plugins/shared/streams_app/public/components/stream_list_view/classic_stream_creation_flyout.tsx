/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import { useAbortController } from '@kbn/react-hooks';
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

interface ClassicStreamCreationFlyoutProps {
  onClose: () => void;
}

export function ClassicStreamCreationFlyout({ onClose }: ClassicStreamCreationFlyoutProps) {
  const { signal } = useAbortController();
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const router = useStreamsAppRouter();

  const templatesListFetch = useStreamsAppFetch(async () => {
    const response = await core.http.get<{
      templates: TemplateDeserialized[];
      legacyTemplates: TemplateDeserialized[];
    }>('/api/index_management/index_templates');

    // Filter to only show templates that:
    // 1. Have data_stream enabled
    // 2. Have at least one index pattern containing a wildcard
    return response.templates.filter((template) => {
      const hasDataStream = template.dataStream !== undefined;
      const hasWildcardPattern = template.indexPatterns?.some((pattern) => pattern.includes('*'));
      return hasDataStream && hasWildcardPattern;
    });
  }, [core.http]);

  const getIlmPolicy = useCallback(
    async (policyName: string) => {
      try {
        const policies = await core.http.get<PolicyFromES[]>(
          '/api/index_lifecycle_management/policies',
          {
            signal,
          }
        );
        return policies.find((policy) => policy.name === policyName) ?? null;
      } catch (error) {
        return null;
      }
    },
    [core.http, signal]
  );

  const handleCreate = useCallback(
    async (streamName: string) => {
      try {
        await streamsRepositoryClient.fetch('POST /internal/streams/_create_classic', {
          signal,
          params: {
            body: {
              name: streamName,
              description: '',
              ingest: {
                processing: { steps: [] },
                lifecycle: { inherit: {} },
                settings: {},
                failure_store: { inherit: {} },
                classic: {
                  field_overrides: {},
                },
              },
            },
          },
        });

        core.notifications.toasts.addSuccess({
          title: `Classic stream created`,
        });

        router.push('/{key}/management/{tab}', {
          path: { key: streamName, tab: 'schema' },
          query: {},
        });

        onClose();
      } catch (error) {
        core.notifications.toasts.addError(error as Error, {
          title: `Failed to create classic stream "${streamName}"`,
        });
      }
    },
    [streamsRepositoryClient, signal, core.notifications.toasts, router, onClose]
  );

  const handleValidate = useCallback(
    async (
      streamName: string,
      selectedTemplate: TemplateDeserialized,
      validationSignal?: AbortSignal
    ) => {
      try {
        const response = await streamsRepositoryClient.fetch(
          'POST /internal/streams/_validate_classic_stream',
          {
            signal: validationSignal || signal,
            params: {
              body: {
                name: streamName,
                selectedTemplateName: selectedTemplate.name,
              },
            },
          }
        );

        if (!response.isValid && response.errorType) {
          return {
            errorType: response.errorType as 'duplicate' | 'higherPriority',
            conflictingIndexPattern: response.conflictingIndexPattern,
          };
        }

        return { errorType: null };
      } catch (error) {
        core.notifications.toasts.addError(error as Error, {
          title: `Failed to validate classic stream "${streamName}"`,
        });
        return { errorType: null };
      }
    },
    [streamsRepositoryClient, signal, core.notifications.toasts]
  );

  const handleCreateTemplate = useCallback(() => {
    // Navigate to index management templates page
    const path = core.http.basePath.prepend('/app/management/data/index_management/templates');
    core.application.navigateToUrl(path);
    onClose();
  }, [core.application, core.http, onClose]);

  const handleRetryLoadTemplates = useCallback(() => {
    templatesListFetch.refresh();
  }, [templatesListFetch]);

  return (
    <CreateClassicStreamFlyout
      onClose={onClose}
      onCreate={handleCreate}
      onCreateTemplate={handleCreateTemplate}
      templates={templatesListFetch.value || []}
      hasErrorLoadingTemplates={!!templatesListFetch.error}
      onRetryLoadTemplates={handleRetryLoadTemplates}
      onValidate={handleValidate}
      getIlmPolicy={getIlmPolicy}
    />
  );
}
