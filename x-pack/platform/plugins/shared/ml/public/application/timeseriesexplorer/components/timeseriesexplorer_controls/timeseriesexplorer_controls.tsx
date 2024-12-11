/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiCheckbox,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import type { MlJobState } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CombinedJobWithStats } from '../../../../../server/shared';
import type { JobId } from '../../../../../common/types/anomaly_detection_jobs/job';
import { useMlKibana } from '../../../contexts/kibana';
import { useCasesModal } from '../../../contexts/kibana/use_cases_modal';
import { getDefaultSingleMetricViewerPanelTitle } from '../../../../embeddables/single_metric_viewer/get_default_panel_title';
import type { MlEntity } from '../../../../embeddables';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '../../../../embeddables/constants';
import type { SingleMetricViewerEmbeddableState } from '../../../../embeddables/types';
import { ForecastingModal } from '../forecasting_modal/forecasting_modal';
import type { Entity } from '../entity_control/entity_control';

interface Props {
  forecastId?: string;
  selectedDetectorIndex: number;
  selectedEntities?: MlEntity;
  showAnnotationsCheckbox: boolean;
  showAnnotations: boolean;
  showForecastCheckbox: boolean;
  showForecast: boolean;
  showModelBoundsCheckbox: boolean;
  showModelBounds: boolean;
  onShowModelBoundsChange: () => void;
  onShowAnnotationsChange: () => void;
  onShowForecastChange: () => void;
  fullRefresh: boolean;
  loading: boolean;
  hasResults: boolean;
  selectedJob: CombinedJobWithStats;
  selectedJobId: string;
  jobs: CombinedJobWithStats[];
  setForecastId: (forecastId: string) => void;
  entities: Entity[];
  jobState: MlJobState;
  earliestRecordTimestamp: number;
  latestRecordTimestamp: number;
}

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

function getDefaultEmbeddablePanelConfig(jobId: JobId, queryString?: string) {
  return {
    title: getDefaultSingleMetricViewerPanelTitle(jobId).concat(
      queryString ? `- ${queryString}` : ''
    ),
    id: htmlIdGenerator()(),
  };
}

export const TimeSeriesExplorerControls: FC<Props> = ({
  forecastId,
  selectedDetectorIndex,
  selectedEntities,
  selectedJobId,
  showAnnotations,
  showAnnotationsCheckbox,
  showForecast,
  showForecastCheckbox,
  showModelBounds,
  showModelBoundsCheckbox,
  onShowAnnotationsChange,
  onShowModelBoundsChange,
  onShowForecastChange,
  fullRefresh,
  loading,
  hasResults,
  setForecastId,
  selectedJob,
  entities,
  jobs,
  jobState,
  earliestRecordTimestamp,
  latestRecordTimestamp,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [createInDashboard, setCreateInDashboard] = useState<boolean>(false);

  const {
    services: {
      application: { capabilities },
      cases,
      embeddable,
    },
  } = useMlKibana();

  const globalTimeRange = useTimeRangeUpdates(true);

  const canEditDashboards = capabilities.dashboard?.createNew ?? false;

  const closePopoverOnAction = useCallback(
    (actionCallback: Function) => {
      return () => {
        setIsMenuOpen(false);
        actionCallback();
      };
    },
    [setIsMenuOpen]
  );

  const openCasesModalCallback = useCasesModal(ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE);

  const showControls =
    (fullRefresh === false || loading === false) && hasResults === true && jobs.length > 0;

  const menuPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        {
          name: (
            <FormattedMessage
              id="xpack.ml.timeseriesExplorer.addToDashboardLabel"
              defaultMessage="Add to dashboard"
            />
          ),
          onClick: closePopoverOnAction(() => {
            setCreateInDashboard(true);
          }),
        },
      ],
    },
  ];

  const casesPrivileges = cases?.helpers.canUseCases();

  if (!!casesPrivileges?.create || !!casesPrivileges?.update) {
    menuPanels[0].items!.push({
      name: (
        <FormattedMessage
          id="xpack.ml.timeseriesExplorer.addToCaseLabel"
          defaultMessage="Add to case"
        />
      ),
      onClick: closePopoverOnAction(() => {
        openCasesModalCallback({
          forecastId,
          jobIds: [selectedJobId],
          selectedDetectorIndex,
          selectedEntities,
          timeRange: globalTimeRange,
        });
      }),
    });
  }

  const onSaveCallback: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();
      const config = getDefaultEmbeddablePanelConfig(selectedJobId);

      const embeddableInput: Partial<SingleMetricViewerEmbeddableState> = {
        id: config.id,
        title: newTitle,
        description: newDescription,
        forecastId,
        jobIds: [selectedJobId],
        selectedDetectorIndex,
        selectedEntities,
      };

      const state = {
        input: embeddableInput,
        type: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, selectedJobId, selectedDetectorIndex, selectedEntities, forecastId]
  );

  return (
    <>
      <EuiFlexGroup style={{ float: 'right' }} alignItems="center" justifyContent="flexEnd">
        {showControls && (
          <>
            {showModelBoundsCheckbox && (
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiCheckbox
                    id="toggleModelBoundsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
                      defaultMessage: 'show model bounds',
                    })}
                    checked={showModelBounds}
                    onChange={onShowModelBoundsChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}

            {showAnnotationsCheckbox && (
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiCheckbox
                    id="toggleAnnotationsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
                      defaultMessage: 'annotations',
                    })}
                    checked={showAnnotations}
                    onChange={onShowAnnotationsChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}

            {showForecastCheckbox && (
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiCheckbox
                    id="toggleShowForecastCheckbox"
                    label={
                      <span data-test-subj={'mlForecastCheckbox'}>
                        {i18n.translate('xpack.ml.timeSeriesExplorer.showForecastLabel', {
                          defaultMessage: 'show forecast',
                        })}
                      </span>
                    }
                    checked={showForecast}
                    onChange={onShowForecastChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}

            {canEditDashboards ? (
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiPopover
                    button={
                      <EuiButton
                        aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                          defaultMessage: 'Actions',
                        })}
                        iconSide="right"
                        isSelected={isMenuOpen}
                        iconType={isMenuOpen ? 'arrowUp' : 'arrowDown'}
                        onClick={setIsMenuOpen.bind(null, !isMenuOpen)}
                        data-test-subj="mlAnomalyTimelinePanelMenu"
                      >
                        <FormattedMessage
                          id="xpack.ml.explorer.addToLabel"
                          defaultMessage="Add to"
                        />
                      </EuiButton>
                    }
                    isOpen={isMenuOpen}
                    closePopover={setIsMenuOpen.bind(null, false)}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenu initialPanelId={0} panels={menuPanels} />
                  </EuiPopover>
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
          </>
        )}
        <EuiFormRow hasEmptyLabelSpace>
          <ForecastingModal
            job={selectedJob}
            jobState={jobState}
            detectorIndex={selectedDetectorIndex}
            entities={entities}
            earliestRecordTimestamp={earliestRecordTimestamp}
            latestRecordTimestamp={latestRecordTimestamp}
            setForecastId={setForecastId}
            className="forecast-controls"
            selectedForecastId={forecastId}
          />
        </EuiFormRow>
      </EuiFlexGroup>
      {createInDashboard ? (
        <SavedObjectSaveModalDashboard
          canSaveByReference={false}
          objectType={i18n.translate('xpack.ml.cases.singleMetricViewer.displayName', {
            defaultMessage: 'Single Metric Viewer',
          })}
          documentInfo={{
            title: getDefaultSingleMetricViewerPanelTitle(selectedJobId),
          }}
          onClose={() => setCreateInDashboard(false)}
          onSave={onSaveCallback}
        />
      ) : null}
    </>
  );
};
