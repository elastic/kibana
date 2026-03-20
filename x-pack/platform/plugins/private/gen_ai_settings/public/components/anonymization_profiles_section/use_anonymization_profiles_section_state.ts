/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { StartServices } from '../../hooks/use_kibana';
import { isAnonymizationCapabilities } from '../../utils/anonymization_capabilities';

interface AnonymizationCapabilities {
  show: boolean;
  manage: boolean;
}

interface DataViewByIdResponse {
  data_view?: { title?: string };
}

interface SearchResponse {
  rawResponse?: {
    hits?: {
      hits?: Array<{ _source?: Record<string, unknown> }>;
    };
  };
}

const ANONYMIZATION_FEATURE_ID = 'anonymization';

type ServicesSubset = Pick<StartServices, 'application' | 'http' | 'notifications'>;

export const useAnonymizationProfilesSectionState = ({
  services,
}: {
  services: ServicesSubset;
}) => {
  const { application, http, notifications } = services;

  const { spaceId: pathSpaceId } = getSpaceIdFromPath(
    http.basePath.get(),
    http.basePath.serverBasePath
  );
  const activeSpaceId = pathSpaceId;

  const anonymizationCapabilities = useMemo<AnonymizationCapabilities>(() => {
    const capabilityValue = application.capabilities[ANONYMIZATION_FEATURE_ID];
    if (!isAnonymizationCapabilities(capabilityValue)) {
      return {
        show: false,
        manage: false,
      };
    }

    return {
      show: capabilityValue.show === true,
      manage: capabilityValue.manage === true,
    };
  }, [application.capabilities]);

  const fetchPreviewDocument = useCallback(
    async ({
      targetType,
      targetId,
    }: {
      targetType: 'index' | 'index_pattern' | 'data_view';
      targetId: string;
    }) => {
      const trimmedTargetId = targetId.trim();
      if (!trimmedTargetId) {
        return undefined;
      }

      let indexPattern = trimmedTargetId;
      if (targetType === 'data_view') {
        const dataViewResponse = await http.fetch<DataViewByIdResponse>(
          `/api/data_views/data_view/${encodeURIComponent(trimmedTargetId)}`
        );
        indexPattern = dataViewResponse.data_view?.title?.trim() ?? '';
        if (!indexPattern) {
          return undefined;
        }
      }

      try {
        const response = await http.post<SearchResponse>('/internal/search/ese', {
          version: '1',
          body: JSON.stringify({
            params: {
              index: indexPattern,
              ignore_unavailable: true,
              expand_wildcards: 'open',
              size: 1,
              query: { match_all: {} },
              sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
            },
          }),
        });

        const source = response.rawResponse?.hits?.hits?.[0]?._source;
        if (source && typeof source === 'object') {
          return source;
        }
      } catch {
        return undefined;
      }

      return undefined;
    },
    [http]
  );

  const onCreateSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      i18n.translate('genAiSettings.anonymizationProfiles.create.success', {
        defaultMessage: 'Profile created',
      })
    );
  }, [notifications.toasts]);

  const onUpdateSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      i18n.translate('genAiSettings.anonymizationProfiles.update.success', {
        defaultMessage: 'Profile updated',
      })
    );
  }, [notifications.toasts]);

  const onDeleteSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      i18n.translate('genAiSettings.anonymizationProfiles.delete.success', {
        defaultMessage: 'Profile deleted',
      })
    );
  }, [notifications.toasts]);

  const onCreateConflict = useCallback(() => {
    notifications.toasts.addWarning(
      i18n.translate('genAiSettings.anonymizationProfiles.create.conflict', {
        defaultMessage: 'A profile already exists for this target.',
      })
    );
  }, [notifications.toasts]);

  const onOpenConflictError = useCallback(
    (error: unknown) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      notifications.toasts.addError(normalizedError, {
        title: i18n.translate('genAiSettings.anonymizationProfiles.conflict.openFailed', {
          defaultMessage: 'Unable to open conflicting profile',
        }),
      });
    },
    [notifications.toasts]
  );

  return {
    activeSpaceId,
    canShow: anonymizationCapabilities.show,
    canManage: anonymizationCapabilities.manage,
    fetchPreviewDocument,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onCreateConflict,
    onOpenConflictError,
  };
};
