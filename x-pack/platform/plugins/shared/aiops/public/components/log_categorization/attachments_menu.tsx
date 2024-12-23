/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import React, { useCallback, useState } from 'react';
import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import type { PatternAnalysisEmbeddableState } from '../../embeddables/pattern_analysis/types';
import type { RandomSamplerOption, RandomSamplerProbability } from './sampling_menu/random_sampler';
import { useCasesModal } from '../../hooks/use_cases_modal';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { CASES_TOAST_MESSAGES_TITLES } from '../../cases/constants';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

interface AttachmentsMenuProps {
  randomSamplerMode: RandomSamplerOption;
  randomSamplerProbability: RandomSamplerProbability;
  dataView: DataView;
  selectedField?: string;
}

export const AttachmentsMenu = ({
  randomSamplerMode,
  randomSamplerProbability,
  dataView,
  selectedField,
}: AttachmentsMenuProps) => {
  const {
    application: { capabilities },
    cases,
    embeddable,
  } = useAiopsAppContext();

  const [applyTimeRange, setApplyTimeRange] = useState(false);

  const [dashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const { create: canCreateCase, update: canUpdateCase } = cases?.helpers?.canUseCases() ?? {
    create: false,
    update: false,
  };

  const openCasesModalCallback = useCasesModal(
    EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
    CASES_TOAST_MESSAGES_TITLES.PATTERN_ANALYSIS
  );

  const timeRange = useTimeRangeUpdates();

  const canEditDashboards = capabilities.dashboard_v2.createNew;

  const onSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();

      const embeddableInput: Partial<PatternAnalysisEmbeddableState> = {
        title: newTitle,
        description: newDescription,
        dataViewId: dataView.id,
        fieldName: selectedField,
        randomSamplerMode,
        randomSamplerProbability,
        minimumTimeRangeOption: 'No minimum',
        ...(applyTimeRange && { timeRange }),
      };

      const state = {
        input: embeddableInput,
        type: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [
      embeddable,
      dataView.id,
      selectedField,
      randomSamplerMode,
      randomSamplerProbability,
      applyTimeRange,
      timeRange,
    ]
  );

  const panels = useMemo<Exclude<EuiContextMenuProps['panels'], undefined>>(() => {
    return [
      {
        id: 'attachMainPanel',
        size: 's',
        items: [
          ...(canEditDashboards
            ? [
                {
                  name: i18n.translate('xpack.aiops.logCategorization.addToDashboardTitle', {
                    defaultMessage: 'Add to dashboard',
                  }),
                  panel: 'attachToDashboardPanel',
                  icon: 'dashboardApp',
                  'data-test-subj': 'aiopsLogPatternAnalysisAttachToDashboardButton',
                },
              ]
            : []),
          ...(canUpdateCase || canCreateCase
            ? [
                {
                  name: i18n.translate('xpack.aiops.logCategorization.attachToCaseLabel', {
                    defaultMessage: 'Add to case',
                  }),
                  icon: 'casesApp',
                  'data-test-subj': 'aiopsLogPatternAnalysisAttachToCaseButton',
                  onClick: () => {
                    setIsActionMenuOpen(false);
                    openCasesModalCallback({
                      dataViewId: dataView.id,
                      fieldName: selectedField,
                      minimumTimeRangeOption: 'No minimum',
                      randomSamplerMode,
                      randomSamplerProbability,
                      timeRange,
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
        title: i18n.translate('xpack.aiops.logCategorization.addToDashboardTitle', {
          defaultMessage: 'Add to dashboard',
        }),
        content: (
          <EuiPanel paddingSize="s">
            <EuiSpacer size="s" />
            <EuiForm>
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate('xpack.aiops.logCategorization.applyTimeRangeLabel', {
                    defaultMessage: 'Apply time range',
                  })}
                  checked={applyTimeRange}
                  onChange={(e) => setApplyTimeRange(e.target.checked)}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiButton
                size="s"
                data-test-subj="aiopsLogPatternAnalysisAttachToDashboardSubmitButton"
                fill
                fullWidth
                type={'submit'}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setDashboardAttachmentReady(true);
                }}
              >
                <FormattedMessage
                  id="xpack.aiops.logCategorization.attachToDashboardSubmitButtonLabel"
                  defaultMessage="Attach"
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
    applyTimeRange,
    openCasesModalCallback,
    dataView.id,
    selectedField,
    randomSamplerMode,
    randomSamplerProbability,
    timeRange,
  ]);

  return (
    <>
      {!!panels[0]?.items?.length && (
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="aiopsLogPatternAnalysisAttachmentsMenuButton"
                aria-label={i18n.translate(
                  'xpack.aiops.logCategorization.attachmentsMenuAriaLabel',
                  {
                    defaultMessage: 'Attachments',
                  }
                )}
                size="m"
                color="text"
                display="base"
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
          objectType={i18n.translate('xpack.aiops.logCategorization.objectTypeLabel', {
            defaultMessage: 'Log pattern analysis',
          })}
          documentInfo={{
            title: 'Log pattern analysis',
          }}
          onClose={() => setDashboardAttachmentReady(false)}
          onSave={onSave}
        />
      ) : null}
    </>
  );
};
