/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type {
  IndexManagementLocatorParams,
  TemplateListItem as IndexTemplate,
} from '@kbn/index-management-shared-types';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { useAbortController } from '@kbn/react-hooks';
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { getFormattedError } from '../../util/errors';

interface ClassicStreamCreationFlyoutProps {
  onClose: () => void;
}

export function ClassicStreamCreationFlyout({ onClose }: ClassicStreamCreationFlyoutProps) {
  const { signal } = useAbortController();
  const {
    core,
    dependencies: {
      start: {
        share,
        indexManagement,
        indexLifecycleManagement,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const isIlmAvailable = !!indexLifecycleManagement?.apiService;

  const templatesListFetch = useStreamsAppFetch(async () => {
    const response = await indexManagement.apiService.getIndexTemplates({ signal });

    // Filter to only show templates that:
    // 1. Have data_stream enabled
    // 2. Have at least one index pattern containing a wildcard
    // 3. Are not hidden
    return response.templates.filter((template) => {
      const isHidden = template.dataStream?.hidden === true;
      const hasDataStream = template.dataStream !== undefined;
      const hasWildcardPattern = template.indexPatterns?.some((pattern) => pattern.includes('*'));
      return hasDataStream && hasWildcardPattern && !isHidden;
    });
  }, [indexManagement.apiService, signal]);

  const getIlmPolicy = useCallback(
    async (policyName: string) => {
      if (!isIlmAvailable) {
        return null;
      }
      // Errors are handled in the flyout component
      const policies = await indexLifecycleManagement.apiService.getPolicies({ signal });
      return policies.find((policy) => policy.name === policyName) ?? null;
    },
    [indexLifecycleManagement?.apiService, isIlmAvailable, signal]
  );

  const getSimulatedTemplate = useCallback(
    async (templateName: string, templateSignal?: AbortSignal) => {
      // Errors are handled in the flyout component
      return await indexManagement.apiService.simulateIndexTemplate({
        templateName,
        signal: templateSignal ?? signal,
      });
    },
    [indexManagement.apiService, signal]
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
                classic: {},
              },
            },
          },
        });

        core.notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.streams.classicStreamCreationFlyout.streamCreatedToastTitle',
            {
              defaultMessage: 'Classic stream created',
            }
          ),
        });

        router.push('/{key}/management/{tab}', {
          path: { key: streamName, tab: 'retention' },
          query: { rangeFrom, rangeTo },
        });

        onClose();
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate(
            'xpack.streams.classicStreamCreationFlyout.streamCreationFailedToastTitle',
            {
              defaultMessage: 'Failed to create classic stream "{streamName}"',
              values: { streamName },
            }
          ),
        });
      }
    },
    [
      streamsRepositoryClient,
      signal,
      core.notifications.toasts,
      router,
      onClose,
      rangeFrom,
      rangeTo,
    ]
  );

  const handleValidate = useCallback(
    async (streamName: string, selectedTemplate: IndexTemplate, validationSignal?: AbortSignal) => {
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
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate(
            'xpack.streams.classicStreamCreationFlyout.streamValidationFailedToastTitle',
            {
              defaultMessage: 'Failed to validate classic stream "{streamName}"',
              values: { streamName },
            }
          ),
        });
        // Re-throw the error to be handled by the caller (useStreamValidation) - it will be caught and dispatched as an ABORT_VALIDATION action.
        throw error;
      }
    },
    [streamsRepositoryClient, signal, core.notifications.toasts]
  );

  const handleCreateTemplate = useCallback(() => {
    const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
      INDEX_MANAGEMENT_LOCATOR_ID
    );
    indexManagementLocator?.navigate({ page: 'create_template' });
    onClose();
  }, [onClose, share.url.locators]);

  const handleRetryLoadTemplates = useCallback(() => {
    templatesListFetch.refresh();
  }, [templatesListFetch]);

  return (
    <CreateClassicStreamFlyout
      onClose={onClose}
      onCreate={handleCreate}
      onCreateTemplate={handleCreateTemplate}
      templates={templatesListFetch.value || []}
      isLoadingTemplates={templatesListFetch.loading}
      hasErrorLoadingTemplates={!!templatesListFetch.error}
      onRetryLoadTemplates={handleRetryLoadTemplates}
      onValidate={handleValidate}
      getIlmPolicy={isIlmAvailable ? getIlmPolicy : undefined}
      getSimulatedTemplate={getSimulatedTemplate}
    />
  );
}
