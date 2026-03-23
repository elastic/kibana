/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';
import { createIndexPatternService } from '../../../data_views_service/service';
import { useLensDispatch, updateIndexPatterns } from '../../../state_management';
import { replaceIndexpattern } from '../../../state_management/lens_slice';
import type { LayerConfigurationProps } from './types';
import type { ConfigPanelWrapperProps } from '../../../editor_frame_service/editor_frame/config_panel/types';

export function LayerConfiguration({
  attributes,
  coreStart,
  startDependencies,
  framePublicAPI,
  hasPadding,
  setIsInlineFlyoutVisible,
  getUserMessages,
  onlyAllowSwitchToSubtypes,
  lensAdapters,
  dataLoading$,
  setCurrentAttributes,
  updateSuggestion,
  parentApi,
  panelId,
  closeFlyout,
  editorContainer,
  onTextBasedQueryStateChange,
}: LayerConfigurationProps) {
  // Derive whether we're in text-based mode from the query type
  const isTextBasedMode = isOfAggregateQueryType(attributes.state.query);
  const dispatch = useLensDispatch();
  const { euiTheme } = useEuiTheme();
  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews: startDependencies.dataViews,
        uiActions: startDependencies.uiActions,
        core: coreStart,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatch(updateIndexPatterns(newIndexPatternsState));
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatch(replaceIndexpattern({ newIndexPattern, oldId }));
        },
      }),
    [coreStart, dispatch, startDependencies.dataViews, startDependencies.uiActions]
  );

  const configPanelWrapperProps: ConfigPanelWrapperProps = {
    attributes,
    lensAdapters,
    dataLoading$,
    framePublicAPI,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: isTextBasedMode,
    // TODO: remove this prop once we display the chart switch in Discover
    onlyAllowSwitchToSubtypes,
    indexPatternService,
    setIsInlineFlyoutVisible,
    getUserMessages,
    data: startDependencies.data,
    setCurrentAttributes,
    updateSuggestion,
    parentApi,
    panelId,
    closeFlyout,
    editorContainer,
    onTextBasedQueryStateChange,
  };
  return (
    <div
      css={css`
        padding: ${hasPadding ? euiTheme.size.s : 0};
      `}
    >
      <ConfigPanelWrapper {...configPanelWrapperProps} />
    </div>
  );
}
