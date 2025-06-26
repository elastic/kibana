/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiTableRowCell, EuiTableRow } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  DataStreamMigrationStatus,
  DataStreamsAction,
  EnrichedDeprecationInfo,
} from '../../../../../../common/types';
import { GlobalFlyout } from '../../../../../shared_imports';
import { useAppContext } from '../../../../app_context';
import {
  uiMetricService,
  UIM_DATA_STREAM_REINDEX_CLOSE_FLYOUT_CLICK,
  UIM_DATA_STREAM_REINDEX_OPEN_FLYOUT_CLICK,
  UIM_DATA_STREAM_REINDEX_OPEN_MODAL_CLICK,
  UIM_DATA_STREAM_REINDEX_CLOSE_MODAL_CLICK,
} from '../../../../lib/ui_metric';
import { DeprecationTableColumns } from '../../../types';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { DataStreamReindexResolutionCell } from './resolution_table_cell';
import { DataStreamReindexFlyout } from './flyout';
import { DataStreamMigrationStatusProvider, useDataStreamMigrationContext } from './context';
import { DataStreamReindexActionsCell } from './actions_table_cell';
import { DataStreamReadonlyModal } from './flyout/modal_container';

const { useGlobalFlyout } = GlobalFlyout;

interface TableRowProps {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
  index: number;
}

const DataStreamTableRowCells: React.FunctionComponent<TableRowProps> = ({
  rowFieldNames,
  deprecation,
  index,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'readonly' | 'delete'>('readonly');
  const dataStreamContext = useDataStreamMigrationContext();
  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();
  const { initMigration, migrationState } = dataStreamContext;

  const closeFlyout = useCallback(async () => {
    removeContentFromGlobalFlyout('dataStreamReindexFlyout');
    setShowFlyout(false);
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_CLOSE_FLYOUT_CLICK);
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout({
        id: 'dataStreamReindexFlyout',
        Component: DataStreamReindexFlyout,
        props: {
          ...dataStreamContext,
          deprecation,
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
          className: 'eui-textBreakWord',
          'data-test-subj': 'reindexDataStreamDetails',
          'aria-labelledby': 'reindexDataStreamDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, deprecation, dataStreamContext, showFlyout, closeFlyout]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_CLOSE_MODAL_CLICK);
  }, []);

  useEffect(() => {
    if (showFlyout) {
      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_OPEN_FLYOUT_CLICK);
    }
  }, [showFlyout]);

  useEffect(() => {
    if (showModal) {
      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_OPEN_MODAL_CLICK);
    }
  }, [showModal]);

  return (
    <>
      {showModal && (
        <DataStreamReadonlyModal
          closeModal={closeModal}
          deprecation={deprecation}
          modalType={modalType}
          {...dataStreamContext}
        />
      )}
      <EuiTableRow data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
        {rowFieldNames.map((field: DeprecationTableColumns) => {
          return (
            <EuiTableRowCell
              key={field}
              truncateText={false}
              data-test-subj={`dataStreamReindexTableCell-${field}`}
              align={field === 'actions' ? 'right' : 'left'}
            >
              <EsDeprecationsTableCells
                fieldName={field}
                deprecation={deprecation}
                resolutionTableCell={
                  <DataStreamReindexResolutionCell
                    correctiveAction={deprecation.correctiveAction as DataStreamsAction}
                  />
                }
                actionsTableCell={
                  <DataStreamReindexActionsCell
                    correctiveAction={deprecation.correctiveAction as DataStreamsAction}
                    openFlyout={() => {
                      setShowFlyout(true);
                      if (migrationState.status === DataStreamMigrationStatus.notStarted) {
                        initMigration('reindex');
                      }
                    }}
                    openModal={(migrationType: 'readonly' | 'delete') => {
                      setShowModal(true);
                      setModalType(migrationType);
                      if (migrationState.status === DataStreamMigrationStatus.notStarted) {
                        initMigration(migrationType);
                      }
                    }}
                  />
                }
              />
            </EuiTableRowCell>
          );
        })}
      </EuiTableRow>
    </>
  );
};

export const DataStreamTableRow: React.FunctionComponent<TableRowProps> = (props) => {
  const {
    services: { api },
  } = useAppContext();

  return (
    <DataStreamMigrationStatusProvider dataStreamName={props.deprecation.index!} api={api}>
      <DataStreamTableRowCells {...props} />
    </DataStreamMigrationStatusProvider>
  );
};
