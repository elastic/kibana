/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { LazySavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { useState, useCallback, useMemo } from 'react';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiContextMenuProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis/window_parameters';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { CASES_TOAST_MESSAGES_TITLES } from '../../../cases/constants';
import { useCasesModal } from '../../../hooks/use_cases_modal';
import { useDataSource } from '../../../hooks/use_data_source';
import type { LogRateAnalysisEmbeddableState } from '../../../embeddables/log_rate_analysis/types';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

interface LogRateAnalysisAttachmentsMenuProps {
  windowParameters?: WindowParameters;
  showLogRateAnalysisResults: boolean;
  significantItems: SignificantItem[];
}

export const LogRateAnalysisAttachmentsMenu = ({
  windowParameters,
  showLogRateAnalysisResults,
  significantItems,
}: LogRateAnalysisAttachmentsMenuProps) => {
  const {
    application: { capabilities },
    cases,
    embeddable,
  } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const [applyTimeRange, setApplyTimeRange] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [dashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);

  const timeRange = useTimeRangeUpdates();
  const absoluteTimeRange = useTimeRangeUpdates(true);

  const openCasesModalCallback = useCasesModal(
    EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
    CASES_TOAST_MESSAGES_TITLES.LOG_RATE_ANALYSIS
  );

  const canEditDashboards = capabilities.dashboard_v2.createNew;

  const { create: canCreateCase, update: canUpdateCase } = cases?.helpers?.canUseCases() ?? {
    create: false,
    update: false,
  };

  const isCasesAttachmentEnabled = showLogRateAnalysisResults && significantItems.length > 0;

  const onSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();

      const embeddableInput: Partial<LogRateAnalysisEmbeddableState> = {
        title: newTitle,
        description: newDescription,
        dataViewId: dataView.id,
        hidePanelTitles: false,
        ...(applyTimeRange && { timeRange }),
      };

      const state = {
        input: embeddableInput,
        type: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', { state, path });
    },
    [dataView.id, embeddable, applyTimeRange, timeRange]
  );

  const caseAttachmentTooltipContent = useMemo(() => {
    if (!showLogRateAnalysisResults) {
      return i18n.translate('xpack.aiops.logRateAnalysis.attachToCaseTooltipNoAnalysis', {
        defaultMessage: 'Run the analysis first to add results to a case.',
      });
    }
    if (significantItems.length === 0) {
      return i18n.translate('xpack.aiops.logRateAnalysis.attachToCaseTooltipNoResults', {
        defaultMessage: 'Cannot add to case because the analysis did not produce any results.',
      });
    }
  }, [showLogRateAnalysisResults, significantItems.length]);

  const panels = useMemo<Exclude<EuiContextMenuProps['panels'], undefined>>(() => {
    return [
      {
        id: 'attachMainPanel',
        size: 's',
        items: [
          ...(canEditDashboards
            ? [
                {
                  name: i18n.translate('xpack.aiops.logRateAnalysis.addToDashboardTitle', {
                    defaultMessage: 'Add to dashboard',
                  }),
                  icon: 'dashboardApp',
                  panel: 'attachToDashboardPanel',
                  'data-test-subj': 'aiopsLogRateAnalysisAttachToDashboardButton',
                },
              ]
            : []),
          ...(canUpdateCase || canCreateCase
            ? [
                {
                  name: i18n.translate('xpack.aiops.logRateAnalysis.attachToCaseLabel', {
                    defaultMessage: 'Add to case',
                  }),
                  icon: 'casesApp',
                  'data-test-subj': 'aiopsLogRateAnalysisAttachToCaseButton',
                  disabled: !isCasesAttachmentEnabled,
                  ...(!isCasesAttachmentEnabled
                    ? {
                        toolTipProps: { position: 'left' as const },
                        toolTipContent: caseAttachmentTooltipContent,
                      }
                    : {}),
                  onClick: () => {
                    setIsActionMenuOpen(false);
                    openCasesModalCallback({
                      dataViewId: dataView.id,
                      timeRange: absoluteTimeRange,
                      ...(windowParameters && { windowParameters }),
                    });
                  },
                },
              ]
            : []),
        ],
      },
      {
        id: 'attachToDashboardPanel',
        size: 's',
        title: i18n.translate('xpack.aiops.logRateAnalysis.attachToDashboardTitle', {
          defaultMessage: 'Add to dashboard',
        }),
        content: (
          <EuiPanel paddingSize="s">
            <EuiSpacer size="s" />
            <EuiForm>
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate('xpack.aiops.logRateAnalysis.applyTimeRangeLabel', {
                    defaultMessage: 'Apply time range',
                  })}
                  checked={applyTimeRange}
                  onChange={(e) => setApplyTimeRange(e.target.checked)}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                data-test-subj="aiopsLogRateAnalysisAttachToDashboardSubmitButton"
                fill
                fullWidth
                type={'submit'}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setDashboardAttachmentReady(true);
                }}
              >
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.attachToDashboardSubmitButtonLabel"
                  defaultMessage="Add to dashboard"
                />
              </EuiButton>
            </EuiForm>
          </EuiPanel>
        ),
      },
    ];
  }, [
    canEditDashboards,
    canUpdateCase,
    canCreateCase,
    isCasesAttachmentEnabled,
    caseAttachmentTooltipContent,
    applyTimeRange,
    openCasesModalCallback,
    dataView.id,
    absoluteTimeRange,
    windowParameters,
  ]);

  return (
    <>
      {!!panels[0]?.items?.length && (
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="aiopsLogRateAnalysisAttachmentsMenuButton"
                aria-label={i18n.translate('xpack.aiops.logRateAnalysis.attachmentsMenuAriaLabel', {
                  defaultMessage: 'Attachments',
                })}
                color="text"
                display="base"
                size="s"
                isSelected={isActionMenuOpen}
                iconType="boxesHorizontal"
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              />
            }
            isOpen={isActionMenuOpen}
            closePopover={() => setIsActionMenuOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenu panels={panels} initialPanelId="attachMainPanel" />
          </EuiPopover>
        </EuiFlexItem>
      )}
      {dashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          canSaveByReference={false}
          objectType={i18n.translate('xpack.aiops.logRateAnalysis.objectTypeLabel', {
            defaultMessage: 'Log rate analysis',
          })}
          documentInfo={{
            title: 'Log rate analysis',
          }}
          onClose={() => setDashboardAttachmentReady(false)}
          onSave={onSave}
        />
      ) : null}
    </>
  );
};
