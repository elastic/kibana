/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiSpacer,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DashboardSuggestionResult } from '@kbn/streams-schema';
import {
  convertRawDashboardToKibanaInput,
  getDefaultTimeRange,
} from '../../util/dashboard_suggestion_converter';
import { useKibana } from '../../hooks/use_kibana';

interface DashboardSuggestionPreviewProps {
  result: DashboardSuggestionResult;
  streamName: string;
  onClose: () => void;
  onRegenerate?: () => void;
  onSaveAndAttach?: (dashboardId: string) => Promise<void>;
}

export function DashboardSuggestionPreview({
  result,
  streamName,
  onClose,
  onRegenerate,
  onSaveAndAttach,
}: DashboardSuggestionPreviewProps) {
  const { euiTheme } = useEuiTheme();
  const {
    core: { http, notifications },
  } = useKibana();
  const [conversionError, setConversionError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Convert raw dashboard to Kibana format
  const dashboardInput = useMemo(() => {
    if (!result.dashboardSuggestion?.rawDashboard) {
      return undefined;
    }

    try {
      return convertRawDashboardToKibanaInput(result.dashboardSuggestion.rawDashboard);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Failed to convert dashboard');
      return undefined;
    }
  }, [result.dashboardSuggestion?.rawDashboard]);

  const handleSaveAndAttach = useCallback(async () => {
    if (!dashboardInput || !onSaveAndAttach) {
      return;
    }

    setIsSaving(true);
    try {
      // Create the dashboard via the dashboard API
      const dashboardState: DashboardState = {
        title: dashboardInput.title || `Dashboard for ${streamName}`,
        description: dashboardInput.description,
        panels: dashboardInput.panels,
        time_range: dashboardInput.timeRange,
      };

      const response = await http.post<{ id: string }>('/api/dashboards', {
        version: '1',
        query: {
          allowUnmappedKeys: true,
        },
        body: JSON.stringify({
          data: dashboardState,
        }),
      });

      const dashboardId = response.id;

      // Attach the dashboard to the stream
      await onSaveAndAttach(dashboardId);

      notifications.toasts.addSuccess({
        title: SAVE_SUCCESS_TITLE,
        text: SAVE_SUCCESS_TEXT,
      });

      onClose();
    } catch (error) {
      notifications.toasts.addDanger({
        title: SAVE_ERROR_TITLE,
        text: error instanceof Error ? error.message : SAVE_ERROR_TEXT,
      });
    } finally {
      setIsSaving(false);
    }
  }, [dashboardInput, streamName, http, notifications, onSaveAndAttach, onClose]);

  const getCreationOptions = useCallback(async () => {
    if (!dashboardInput) {
      return {
        getInitialInput: () => ({
          viewMode: 'view' as const,
          timeRange: getDefaultTimeRange(),
          panels: {} as DashboardState['panels'],
        }),
      };
    }

    return {
      getInitialInput: () => ({
        viewMode: 'view' as const,
        timeRange: dashboardInput.timeRange || getDefaultTimeRange(),
        panels: dashboardInput.panels,
      }),
    };
  }, [dashboardInput]);

  const styles = useMemo(
    () => ({
      flyoutBody: css({
        '& .euiFlyoutBody__overflowContent': {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }),
      dashboardContainer: css({
        flex: 1,
        minHeight: 400,
        height: '100%',
        '& .embPanel__hoverActions': {
          display: 'none !important',
        },
      }),
      header: css({
        paddingBottom: euiTheme.size.s,
      }),
    }),
    [euiTheme]
  );

  const hasWarnings = result.warnings && result.warnings.length > 0;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="l"
      aria-labelledby="dashboardSuggestionPreviewTitle"
      data-test-subj="dashboard_suggestion_preview_flyout"
    >
      <EuiFlyoutHeader hasBorder css={styles.header}>
        <EuiTitle size="m">
          <h2 id="dashboardSuggestionPreviewTitle">
            {dashboardInput?.title || PREVIEW_TITLE}
          </h2>
        </EuiTitle>
        {dashboardInput?.description && (
          <EuiText size="s" color="subdued">
            {dashboardInput.description}
          </EuiText>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={styles.flyoutBody}>
        {conversionError && (
          <>
            <EuiCallOut
              title={CONVERSION_ERROR_TITLE}
              color="danger"
              iconType="error"
            >
              {conversionError}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {hasWarnings && (
          <>
            <EuiCallOut
              title={WARNINGS_TITLE}
              color="warning"
              iconType="warning"
            >
              <ul>
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {dashboardInput ? (
          <EuiPanel hasBorder css={styles.dashboardContainer}>
            <DashboardRenderer
              getCreationOptions={getCreationOptions}
              showPlainSpinner
              onApiAvailable={(api) => {
                // Force view mode
                api.setViewMode('view');
              }}
            />
          </EuiPanel>
        ) : (
          <EuiCallOut
            title={NO_DASHBOARD_TITLE}
            color="primary"
            iconType="dashboardApp"
          >
            {NO_DASHBOARD_DESCRIPTION}
          </EuiCallOut>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="dashboard_suggestion_preview_close_button"
            >
              {CLOSE_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {onRegenerate && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => {
                      onRegenerate();
                      onClose();
                    }}
                    iconType="refresh"
                    data-test-subj="dashboard_suggestion_preview_regenerate_button"
                  >
                    {REGENERATE_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {onSaveAndAttach && dashboardInput && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handleSaveAndAttach}
                    fill
                    iconType="save"
                    isLoading={isSaving}
                    disabled={isSaving}
                    data-test-subj="dashboard_suggestion_preview_save_button"
                  >
                    {SAVE_AND_ATTACH_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

// i18n labels

const PREVIEW_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.title',
  { defaultMessage: 'Dashboard Preview' }
);

const CONVERSION_ERROR_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.conversionErrorTitle',
  { defaultMessage: 'Failed to convert dashboard' }
);

const WARNINGS_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.warningsTitle',
  { defaultMessage: 'Dashboard generated with warnings' }
);

const NO_DASHBOARD_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.noDashboardTitle',
  { defaultMessage: 'No dashboard available' }
);

const NO_DASHBOARD_DESCRIPTION = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.noDashboardDescription',
  { defaultMessage: 'The dashboard suggestion did not produce any panels. Try regenerating with different guidance.' }
);

const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.closeButtonLabel',
  { defaultMessage: 'Close' }
);

const REGENERATE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.regenerateButtonLabel',
  { defaultMessage: 'Regenerate' }
);

const SAVE_AND_ATTACH_BUTTON_LABEL = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.saveAndAttachButtonLabel',
  { defaultMessage: 'Save & Attach' }
);

const SAVE_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.saveSuccessTitle',
  { defaultMessage: 'Dashboard saved' }
);

const SAVE_SUCCESS_TEXT = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.saveSuccessText',
  { defaultMessage: 'The dashboard has been saved and attached to the stream.' }
);

const SAVE_ERROR_TITLE = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.saveErrorTitle',
  { defaultMessage: 'Failed to save dashboard' }
);

const SAVE_ERROR_TEXT = i18n.translate(
  'xpack.streams.dashboardSuggestionPreview.saveErrorText',
  { defaultMessage: 'An unexpected error occurred while saving the dashboard.' }
);
