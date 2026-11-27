/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { Query } from '@kbn/es-query';
import React, { useCallback, useEffect, useState } from 'react';
import type { ActionButton, InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type {
  StatefulSearchBarProps,
  UnifiedSearchPublicPluginStart,
} from '@kbn/unified-search-plugin/public';
import { DEFAULT_VISUALIZATION_HEIGHT } from './get_visualization_dimensions';
import {
  visualizationEmbeddableStyles,
  visualizationHeaderStyles,
  visualizationTimePickerContainerClassName,
  visualizationWrapperStyles,
} from './styles';
import { FallbackVisualizationActions } from './visualization_actions';

interface VisualizationPreviewShellBaseProps {
  actionButtons: ActionButton[];
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
  height?: number;
  dataTestSubj?: string;
  children: React.ReactNode;
}

interface VisualizationPreviewShellWithTimePicker extends VisualizationPreviewShellBaseProps {
  showTimePicker?: true;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  searchBarProps: StatefulSearchBarProps<Query>;
}

interface VisualizationPreviewShellWithoutTimePicker extends VisualizationPreviewShellBaseProps {
  showTimePicker: false;
}

export type VisualizationPreviewShellProps =
  | VisualizationPreviewShellWithTimePicker
  | VisualizationPreviewShellWithoutTimePicker;

/** Shared preview frame and action-button registration for inline visualizations. */
export function VisualizationPreviewShell({
  actionButtons,
  registerActionButtons,
  height = DEFAULT_VISUALIZATION_HEIGHT,
  dataTestSubj,
  showTimePicker = true,
  children,
  ...timePickerProps
}: VisualizationPreviewShellProps) {
  const unifiedSearch =
    'unifiedSearch' in timePickerProps ? timePickerProps.unifiedSearch : undefined;
  const searchBarProps =
    'searchBarProps' in timePickerProps ? timePickerProps.searchBarProps : undefined;
  const SearchBar = showTimePicker ? unifiedSearch?.ui.SearchBar : undefined;
  const [localActionButtons, setLocalActionButtons] = useState<ActionButton[]>([]);
  const registerLocalActionButtons = useCallback((buttons: ActionButton[]) => {
    setLocalActionButtons(buttons);
  }, []);
  const register = registerActionButtons ?? registerLocalActionButtons;
  const shouldRenderLocalActionButtons = !registerActionButtons && localActionButtons.length > 0;

  useEffect(() => {
    register(actionButtons);
    return () => register([]);
  }, [actionButtons, register]);

  return (
    <div data-test-subj={dataTestSubj} css={visualizationWrapperStyles}>
      {shouldRenderLocalActionButtons && (
        <FallbackVisualizationActions buttons={localActionButtons} />
      )}
      {SearchBar && searchBarProps ? (
        <div css={visualizationHeaderStyles} className={visualizationTimePickerContainerClassName}>
          <SearchBar {...searchBarProps} />
        </div>
      ) : null}
      <div css={[visualizationEmbeddableStyles(height), css({ width: '100%' })]}>{children}</div>
    </div>
  );
}
