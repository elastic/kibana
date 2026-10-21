/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type {
  IndexManagementLocatorParams,
  TemplateListItem as IndexTemplate,
} from '@kbn/index-management-shared-types';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { getFormattedError } from '../../util/errors';
import type { StreamsAppStartDependencies } from '../../types';

interface OverviewClassicStreamFlyoutProps {
  onClose: () => void;
  getStartServices: () => Promise<readonly [CoreStart, StreamsAppStartDependencies, ...unknown[]]>;
}

const isVisibleTemplate = (template: IndexTemplate) => {
  const isHidden = template.dataStream?.hidden === true;
  const hasDataStream = template.dataStream !== undefined;
  const hasWildcardPattern = template.indexPatterns?.some((pattern) => pattern.includes('*'));
  return hasDataStream && hasWildcardPattern && !isHidden;
};

/** Classic stream create flyout that stays on the data management overview. */
export const OverviewClassicStreamFlyout = ({
  onClose,
  getStartServices,
}: OverviewClassicStreamFlyoutProps) => {
  const [start, setStart] = useState<
    readonly [CoreStart, StreamsAppStartDependencies, ...unknown[]] | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    getStartServices().then((services) => {
      if (!cancelled) {
        setStart(services);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getStartServices]);

  if (!start) {
    return null;
  }

  return <ClassicStreamFlyoutOnOverview core={start[0]} plugins={start[1]} onClose={onClose} />;
};

const ClassicStreamFlyoutOnOverview = ({
  core,
  plugins,
  onClose,
}: {
  core: CoreStart;
  plugins: StreamsAppStartDependencies;
  onClose: () => void;
}) => {
  const { signal } = useAbortController();
  const { indexManagement, indexLifecycleManagement, share, streams } = plugins;
  const { streamsRepositoryClient } = streams;
  const isIlmAvailable = !!indexLifecycleManagement?.apiService;
  const [templates, setTemplates] = useState<IndexTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [hasErrorLoadingTemplates, setHasErrorLoadingTemplates] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingTemplates(true);
    setHasErrorLoadingTemplates(false);

    indexManagement.apiService
      .getIndexTemplates({ signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        setTemplates(response.templates.filter(isVisibleTemplate));
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setHasErrorLoadingTemplates(true);
        setTemplates([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingTemplates(false);
        }
      });

    return () => controller.abort();
  }, [indexManagement.apiService, reloadVersion]);

  const getIlmPolicy = useCallback(
    async (policyName: string) => {
      if (!isIlmAvailable || !indexLifecycleManagement) {
        return null;
      }
      const policies = await indexLifecycleManagement.apiService.getPolicies({ signal });
      return policies.find((policy) => policy.name === policyName) ?? null;
    },
    [indexLifecycleManagement, isIlmAvailable, signal]
  );

  const getSimulatedTemplate = useCallback(
    async (templateName: string, templateSignal?: AbortSignal) => {
      return indexManagement.apiService.simulateIndexTemplate({
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
            'xpack.streams.overviewClassicStreamFlyout.streamCreatedToastTitle',
            {
              defaultMessage: 'Classic stream created',
            }
          ),
        });
        onClose();
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate(
            'xpack.streams.overviewClassicStreamFlyout.streamCreationFailedToastTitle',
            {
              defaultMessage: 'Failed to create classic stream "{streamName}"',
              values: { streamName },
            }
          ),
        });
      }
    },
    [core.notifications.toasts, onClose, signal, streamsRepositoryClient]
  );

  const handleValidate = useCallback(
    async (streamName: string, selectedTemplate: IndexTemplate, validationSignal?: AbortSignal) => {
      try {
        const response = await streamsRepositoryClient.fetch(
          'POST /internal/streams/_validate_classic_stream',
          {
            signal: validationSignal ?? null,
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
            'xpack.streams.overviewClassicStreamFlyout.streamValidationFailedToastTitle',
            {
              defaultMessage: 'Failed to validate classic stream "{streamName}"',
              values: { streamName },
            }
          ),
        });
        throw error;
      }
    },
    [core.notifications.toasts, streamsRepositoryClient]
  );

  const handleCreateTemplate = useCallback(() => {
    const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
      INDEX_MANAGEMENT_LOCATOR_ID
    );
    indexManagementLocator?.navigate({ page: 'create_template' });
    onClose();
  }, [onClose, share.url.locators]);

  return (
    <CreateClassicStreamFlyout
      getIlmPolicy={isIlmAvailable ? getIlmPolicy : undefined}
      getSimulatedTemplate={getSimulatedTemplate}
      hasErrorLoadingTemplates={hasErrorLoadingTemplates}
      isLoadingTemplates={isLoadingTemplates}
      onClose={onClose}
      onCreate={handleCreate}
      onCreateTemplate={handleCreateTemplate}
      onRetryLoadTemplates={() => setReloadVersion((version) => version + 1)}
      onValidate={handleValidate}
      templates={templates}
    />
  );
};
