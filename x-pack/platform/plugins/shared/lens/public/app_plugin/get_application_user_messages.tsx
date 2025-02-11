/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { Dispatch } from '@reduxjs/toolkit';
import { partition } from 'lodash';
import {
  updateDatasourceState,
  type DataViewsState,
  type VisualizationState,
  DatasourceState,
} from '../state_management';
import type {
  AddUserMessages,
  Datasource,
  FramePublicAPI,
  UserMessage,
  UserMessageFilters,
  UserMessagesDisplayLocationId,
  UserMessagesGetter,
  Visualization,
} from '../types';
import { getMissingIndexPattern } from '../editor_frame_service/editor_frame/state_helpers';
import {
  EDITOR_MISSING_DATAVIEW,
  EDITOR_MISSING_EXPRESSION_DATAVIEW,
  EDITOR_MISSING_VIS_TYPE,
  EDITOR_UNKNOWN_DATASOURCE_TYPE,
  EDITOR_UNKNOWN_VIS_TYPE,
} from '../user_messages_ids';
import { nonNullable } from '../utils';
import type { LensPublicCallbacks } from '../react_embeddable/types';

export interface UserMessageGetterProps {
  visualizationType: string | null | undefined;
  visualization: Visualization | undefined;
  visualizationState: VisualizationState | undefined;
  activeDatasource: Datasource | null | undefined;
  activeDatasourceState: { isLoading: boolean; state: unknown } | null;
  dataViews: DataViewsState;
  core: CoreStart;
}

/**
 * Provides a place to register general user messages that don't belong in the datasource or visualization objects
 */
export const getApplicationUserMessages = ({
  visualizationType,
  visualization,
  visualizationState,
  activeDatasource,
  activeDatasourceState,
  dataViews,
  core,
}: UserMessageGetterProps): UserMessage[] => {
  const messages: UserMessage[] = [];

  if (!visualizationType) {
    messages.push(getMissingVisTypeError());
  }

  if (visualizationState?.activeId && !visualization) {
    messages.push(getUnknownVisualizationTypeError(visualizationState.activeId));
  }

  if (!activeDatasource) {
    messages.push(getUnknownDatasourceTypeError());
  }

  const missingIndexPatterns = getMissingIndexPattern(
    activeDatasource,
    activeDatasourceState,
    dataViews.indexPatterns
  );

  if (missingIndexPatterns.length) {
    messages.push(...getMissingIndexPatternsErrors(core, missingIndexPatterns));
  }

  return messages;
};

function getMissingVisTypeError(): UserMessage {
  return {
    uniqueId: EDITOR_MISSING_VIS_TYPE,
    severity: 'error',
    displayLocations: [{ id: 'visualizationOnEmbeddable' }],
    fixableInEditor: true,
    shortMessage: '',
    longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingVisualizationType', {
      defaultMessage: 'Visualization type not found.',
    }),
  };
}

function getUnknownVisualizationTypeError(visType: string): UserMessage {
  return {
    uniqueId: EDITOR_UNKNOWN_VIS_TYPE,
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.unknownVisType.shortMessage', {
      defaultMessage: `Unknown visualization type`,
    }),
    longMessage: i18n.translate('xpack.lens.unknownVisType.longMessage', {
      defaultMessage: `The visualization type {visType} could not be resolved.`,
      values: {
        visType,
      },
    }),
  };
}

function getUnknownDatasourceTypeError(): UserMessage {
  return {
    uniqueId: EDITOR_UNKNOWN_DATASOURCE_TYPE,
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.unknownDatasourceType.shortMessage', {
      defaultMessage: `Unknown datasource type`,
    }),
    longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingDatasource', {
      defaultMessage: 'Could not find datasource for the visualization',
    }),
  };
}

function getMissingIndexPatternsErrors(
  core: CoreStart,
  missingIndexPatterns: string[]
): UserMessage[] {
  // Check for access to both Management app && specific indexPattern section
  const { management: isManagementEnabled } = core.application.capabilities.navLinks;
  const isIndexPatternManagementEnabled =
    core.application.capabilities.management?.kibana?.indexPatterns;
  const canFix = isManagementEnabled && isIndexPatternManagementEnabled;
  return [
    {
      uniqueId: EDITOR_MISSING_DATAVIEW,
      severity: 'error',
      fixableInEditor: canFix,
      displayLocations: [{ id: 'visualizationInEditor' }],
      shortMessage: '',
      longMessage: (
        <>
          <p className="eui-textBreakWord" data-test-subj="missing-refs-failure">
            <FormattedMessage
              id="xpack.lens.editorFrame.dataViewNotFound"
              defaultMessage="Data view not found"
            />
          </p>
          <p
            className="eui-textBreakWord"
            style={{
              userSelect: 'text',
            }}
          >
            <FormattedMessage
              id="xpack.lens.indexPattern.missingDataView"
              defaultMessage="The {count, plural, one {data view} other {data views}} ({count, plural, one {id} other {ids}}: {indexpatterns}) cannot be found."
              values={{
                count: missingIndexPatterns.length,
                indexpatterns: missingIndexPatterns.join(', '),
              }}
            />
            {canFix && (
              <RedirectAppLinks coreStart={core}>
                <a
                  href={core.application.getUrlForApp('management', {
                    path: '/kibana/indexPatterns/create',
                  })}
                  style={{ width: '100%', textAlign: 'center' }}
                  data-test-subj="configuration-failure-reconfigure-indexpatterns"
                >
                  {i18n.translate('xpack.lens.editorFrame.dataViewReconfigure', {
                    defaultMessage: `Recreate it in the data view management page.`,
                  })}
                </a>
              </RedirectAppLinks>
            )}
          </p>
        </>
      ),
    },
    {
      uniqueId: EDITOR_MISSING_EXPRESSION_DATAVIEW,
      severity: 'error',
      fixableInEditor: canFix,
      displayLocations: [{ id: 'visualizationOnEmbeddable' }],
      shortMessage: '',
      longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingDataView', {
        defaultMessage:
          'Could not find the {count, plural, one {data view} other {data views}}: {ids}',
        values: { count: missingIndexPatterns.length, ids: missingIndexPatterns.join(', ') },
      }),
    },
  ];
}

export const handleMessageOverwriteFromConsumer = (
  messages: UserMessage[],
  onBeforeBadgesRender?: LensPublicCallbacks['onBeforeBadgesRender']
) => {
  if (onBeforeBadgesRender) {
    // we need something else to better identify those errors
    const [messagesToHandle, originalMessages] = partition(messages, (message) =>
      message.displayLocations.some((location) => location.id === 'embeddableBadge')
    );

    if (messagesToHandle.length > 0) {
      const customBadgeMessages = onBeforeBadgesRender(messagesToHandle);
      return originalMessages.concat(customBadgeMessages);
    }
  }

  return messages;
};

export const filterAndSortUserMessages = (
  userMessages: UserMessage[],
  locationId?: UserMessagesDisplayLocationId | UserMessagesDisplayLocationId[],
  { dimensionId, severity }: UserMessageFilters = {}
) => {
  const locationIds = new Set(
    (Array.isArray(locationId) ? locationId : [locationId]).filter(nonNullable)
  );

  const filteredMessages = userMessages.filter((message) => {
    if (locationIds.size) {
      const hasMatch = message.displayLocations.some((location) => {
        if (!locationIds.has(location.id)) {
          return false;
        }

        return !(location.id === 'dimensionButton' && location.dimensionId !== dimensionId);
      });

      if (!hasMatch) {
        return false;
      }
    }

    return !severity || message.severity === severity;
  });

  return filteredMessages.sort(bySeverity);
};

function bySeverity(a: UserMessage, b: UserMessage) {
  if (a.severity === b.severity) {
    return 0;
  }
  if (a.severity === 'error') {
    return -1;
  }
  if (b.severity === 'error') {
    return 1;
  }
  if (a.severity === 'warning') {
    return -1;
  }
  return 1;
}

export const useApplicationUserMessages = ({
  coreStart,
  dispatch,
  activeDatasourceId,
  datasource,
  datasourceState,
  framePublicAPI,
  visualizationType,
  visualization,
  visualizationState,
}: {
  activeDatasourceId: string | null;
  coreStart: CoreStart;
  datasource: Datasource | null;
  datasourceState: DatasourceState | null;
  dispatch: Dispatch;
  framePublicAPI: FramePublicAPI;
  visualizationType: string | null;
  visualizationState?: VisualizationState;
  visualization?: Visualization;
}) => {
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  // these are messages managed from other parts of Lens
  const [additionalUserMessages, setAdditionalUserMessages] = useState<Record<string, UserMessage>>(
    {}
  );

  useEffect(() => {
    setUserMessages([
      ...(datasourceState && datasourceState.state && datasource && activeDatasourceId
        ? datasource.getUserMessages(datasourceState.state, {
            frame: framePublicAPI,
            setState: (newStateOrUpdater) => {
              dispatch(
                updateDatasourceState({
                  newDatasourceState:
                    typeof newStateOrUpdater === 'function'
                      ? newStateOrUpdater(datasourceState.state)
                      : newStateOrUpdater,
                  datasourceId: activeDatasourceId,
                })
              );
            },
          })
        : []),
      ...(visualizationState?.activeId && visualizationState.state
        ? visualization?.getUserMessages?.(visualizationState.state, {
            frame: framePublicAPI,
          }) ?? []
        : []),
      ...getApplicationUserMessages({
        visualizationType,
        visualization,
        visualizationState,
        activeDatasource: datasource,
        activeDatasourceState: datasourceState,
        core: coreStart,
        dataViews: framePublicAPI.dataViews,
      }),
    ]);
  }, [
    activeDatasourceId,
    datasource,
    datasourceState,
    dispatch,
    framePublicAPI,
    visualization,
    visualizationState,
    visualizationType,
    coreStart,
  ]);

  const getUserMessages: UserMessagesGetter = (locationId, filterArgs) =>
    filterAndSortUserMessages(
      userMessages.concat(Object.values(additionalUserMessages)),
      locationId,
      filterArgs ?? {}
    );

  const addUserMessages: AddUserMessages = (messages) => {
    const newMessageMap = {
      ...additionalUserMessages,
    };

    const addedMessageIds: string[] = [];
    messages.forEach((message) => {
      if (!newMessageMap[message.uniqueId]) {
        addedMessageIds.push(message.uniqueId);
        newMessageMap[message.uniqueId] = message;
      }
    });

    if (addedMessageIds.length) {
      setAdditionalUserMessages(newMessageMap);
    }

    return () => {
      const withMessagesRemoved = {
        ...additionalUserMessages,
      };

      addedMessageIds.forEach((id) => delete withMessagesRemoved[id]);

      setAdditionalUserMessages(withMessagesRemoved);
    };
  };
  return { getUserMessages, addUserMessages };
};
