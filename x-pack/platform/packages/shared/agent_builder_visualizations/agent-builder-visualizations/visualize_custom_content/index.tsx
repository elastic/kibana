/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import {
  ActionButtonType,
  type ActionButton,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import {
  SavedObjectSaveModalDashboard,
  type SaveModalDashboardProps,
} from '@kbn/presentation-util-plugin/public';
import { CustomContentComponent } from '@kbn/custom-content-renderer';
import {
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  toEsqlQueryState,
} from '@kbn/custom-content-common';
import type { VisualizationServices } from '../services';
import {
  visualizationWrapperStyles,
  visualizationHeaderStyles,
  visualizationTimePickerContainerClassName,
} from '../shared/styles';
import { FallbackVisualizationActions } from '../shared/visualization_actions';
import { useVisPreviewUnifiedSearch } from '../shared/use_vis_preview_unified_search';

const saveButtonLabel = i18n.translate(
  'xpack.agentBuilder.visualization.customContent.saveToDashboard',
  { defaultMessage: 'Save to dashboard' }
);

const dashboardWriteControlsDisabledReason = i18n.translate(
  'xpack.agentBuilder.visualization.customContent.dashboardWriteControlsDisabledReason',
  {
    defaultMessage: 'You need dashboard write permissions to save panels to a dashboard.',
  }
);

const saveModalObjectType = i18n.translate(
  'xpack.agentBuilder.visualization.customContent.objectType',
  { defaultMessage: 'Custom panel' }
);

/**
 * Must be a flex column with a definite height, not just a height: the panel's own
 * root is `flex: 1 1 100%` and its iframe container `flex: 1 1 0%`, so in a block
 * parent both collapse to the container's min-height and the frame renders 200px
 * tall inside a correctly sized wrapper. A dashboard panel body is already a flex
 * container, which is why this only shows up in the conversation.
 */
const customContentContainerCss = (height: number) =>
  css({
    display: 'flex',
    flexDirection: 'column',
    height,
    minHeight: 0,
    width: '100%',
  });

export interface VisualizeCustomContentProps {
  services: VisualizationServices;
  /** The stored custom content payload: an HTML/Liquid template and its declared height. */
  visualization: Record<string, unknown> & { template?: string; height?: number };
  /** ES|QL query backing the template. Absent for static content. */
  esql?: string;
  timeRange?: TimeRange;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}

/**
 * Renders a custom content attachment inline in a conversation.
 *
 * The template is untrusted, LLM-authored markup: `CustomContentComponent` is what
 * makes it safe (DOMPurify, a `sandbox=""` iframe and a CSP meta tag), so this must
 * stay the only path a custom content payload reaches the DOM through.
 *
 * There is deliberately no "edit" action to match the Lens renderer's: editing here
 * means asking the agent, which updates the attachment in place and re-renders this.
 */
export const VisualizeCustomContent = ({
  services,
  visualization,
  esql,
  timeRange,
  registerActionButtons,
}: VisualizeCustomContentProps) => {
  const { application, unifiedSearch, embeddable } = services;
  const SearchBar = unifiedSearch.ui.SearchBar;
  const canWriteDashboards = application?.capabilities.dashboard_v2?.showWriteControls === true;

  const { searchBarProps, effectiveTimeRange } = useVisPreviewUnifiedSearch({ timeRange });

  // The panel reports its own loading state through a progress bar; inline in a
  // conversation there is no dashboard render-completion contract to satisfy.
  const onLoadingChange = useCallback(() => {}, []);

  const template = typeof visualization.template === 'string' ? visualization.template : undefined;
  // The chart default is tuned for a chart; custom content is whatever the model built,
  // so prefer the height it declared for this specific template.
  const height =
    typeof visualization.height === 'number' ? visualization.height : CUSTOM_CONTENT_DEFAULT_HEIGHT;

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const openSaveModal = useCallback(() => {
    if (canWriteDashboards) {
      setIsSaveModalOpen(true);
    }
  }, [canWriteDashboards]);
  const closeSaveModal = useCallback(() => setIsSaveModalOpen(false), []);

  const onSaveToDashboard = useCallback<SaveModalDashboardProps['onSave']>(
    async ({ dashboardId, newTitle, newDescription }) => {
      setIsSaveModalOpen(false);
      // Intentionally omit `timeRange`: the saved panel should follow the dashboard's
      // global time range rather than the preview range from the local date picker.
      const serializedState = {
        template,
        esql_query: toEsqlQueryState(esql),
        title: newTitle,
        description: newDescription,
      };

      await embeddable.getStateTransfer().navigateToWithEmbeddablePackages('dashboards', {
        state: [{ type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, serializedState }],
        path: dashboardId && dashboardId !== 'new' ? `#/view/${dashboardId}` : '#/create',
      });
    },
    [template, esql, embeddable]
  );

  // The tool-result / markdown surface has no attachment header to host buttons,
  // so fall back to rendering them locally (matching the other renderers).
  const [localActionButtons, setLocalActionButtons] = useState<ActionButton[]>([]);
  const registerLocalActionButtons = useCallback(
    (buttons: ActionButton[]) => setLocalActionButtons(buttons),
    []
  );
  const register = registerActionButtons ?? registerLocalActionButtons;
  const shouldRenderLocalActionButtons = !registerActionButtons && localActionButtons.length > 0;

  const actionButtons = useMemo<ActionButton[]>(
    () => [
      {
        label: saveButtonLabel,
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: !canWriteDashboards,
        disabledReason: canWriteDashboards ? undefined : dashboardWriteControlsDisabledReason,
        handler: openSaveModal,
      },
    ],
    [canWriteDashboards, openSaveModal]
  );

  useEffect(() => {
    // Nothing to save before a template exists.
    if (!template) {
      register([]);
      return;
    }
    register(actionButtons);
    return () => register([]);
  }, [actionButtons, register, template]);

  return (
    <div data-test-subj="agentBuilderCustomContentVisualization" css={visualizationWrapperStyles}>
      {shouldRenderLocalActionButtons && (
        <FallbackVisualizationActions buttons={localActionButtons} />
      )}
      {/* A static panel has no query to re-range, so the picker would do nothing. */}
      {esql && (
        <div css={visualizationHeaderStyles} className={visualizationTimePickerContainerClassName}>
          <SearchBar {...searchBarProps} />
        </div>
      )}

      <div css={customContentContainerCss(height)}>
        <CustomContentComponent
          services={services.customContent}
          // The conversation has no embeddable; the attachment is the identity here, and
          // the id only keys the fetch effect.
          embeddableId="agent-builder-custom-content"
          esqlQuery={esql}
          timeRange={effectiveTimeRange}
          generationVersion={0}
          savedTemplate={template}
          isApproximate={false}
          projectRouting={undefined}
          query={undefined}
          filters={undefined}
          esqlVariables={undefined}
          previewHtml={null}
          onLoadingChange={onLoadingChange}
        />
      </div>

      {isSaveModalOpen && (
        <SavedObjectSaveModalDashboard
          objectType={saveModalObjectType}
          documentInfo={{ title: '' }}
          canSaveByReference={false}
          onClose={closeSaveModal}
          onSave={onSaveToDashboard}
        />
      )}
    </div>
  );
};
