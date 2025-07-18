/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiTableRowCell, EuiTableRow } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { EnrichedDeprecationInfo, IndicesResolutionType } from '../../../../../../common/types';
import { GlobalFlyout } from '../../../../../shared_imports';
import { useAppContext } from '../../../../app_context';
import {
  uiMetricService,
  UIM_REINDEX_CLOSE_FLYOUT_CLICK,
  UIM_REINDEX_OPEN_FLYOUT_CLICK,
  UIM_REINDEX_CLOSE_MODAL_CLICK,
  UIM_REINDEX_OPEN_MODAL_CLICK,
} from '../../../../lib/ui_metric';
import { DeprecationTableColumns } from '../../../types';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { ReindexResolutionCell } from './resolution_table_cell';
import { IndexFlyout, IndexFlyoutProps } from './flyout';
import { IndexStatusProvider, useIndexContext } from './context';
import { ReindexActionCell } from './actions_table_cell';
import { IndexModal } from './flyout/modal_container';

const { useGlobalFlyout } = GlobalFlyout;

interface TableRowProps {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
  index: number;
}

const IndexTableRowCells: React.FunctionComponent<TableRowProps> = ({
  rowFieldNames,
  deprecation,
  index,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedResolutionType, setSelectedResolutionType] = useState<
    IndicesResolutionType | undefined
  >(undefined);
  const indexContext = useIndexContext();

  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();

  const closeFlyout = useCallback(async () => {
    removeContentFromGlobalFlyout('indexFlyout');
    setShowFlyout(false);
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_CLOSE_FLYOUT_CLICK);
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<IndexFlyoutProps>({
        id: 'indexFlyout',
        Component: IndexFlyout,
        props: {
          closeFlyout,
          ...indexContext,
        },
        flyoutProps: {
          onClose: closeFlyout,
          className: 'eui-textBreakWord',
          'data-test-subj': 'reindexDetails',
          'aria-labelledby': 'reindexDetailsFlyoutTitle',
        },
      });
    }
  }, [
    addContentToGlobalFlyout,
    deprecation,
    showFlyout,
    indexContext,
    closeFlyout,
    selectedResolutionType,
  ]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_CLOSE_MODAL_CLICK);
  }, []);

  useEffect(() => {
    if (showFlyout) {
      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_OPEN_FLYOUT_CLICK);
    }
  }, [showFlyout]);

  useEffect(() => {
    if (showModal) {
      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_OPEN_MODAL_CLICK);
    }
  }, [showModal]);

  return (
    <>
      {showModal && (
        <IndexModal
          closeModal={closeModal}
          selectedResolutionType={selectedResolutionType}
          {...indexContext}
        />
      )}
      <EuiTableRow data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
        {rowFieldNames.map((field: DeprecationTableColumns) => {
          return (
            <EuiTableRowCell
              key={field}
              truncateText={false}
              data-test-subj={`reindexTableCell-${field}`}
              align={field === 'actions' ? 'right' : 'left'}
            >
              <EsDeprecationsTableCells
                fieldName={field}
                deprecation={deprecation}
                resolutionTableCell={<ReindexResolutionCell deprecation={deprecation} />}
                actionsTableCell={
                  <ReindexActionCell
                    openFlyout={() => setShowFlyout(true)}
                    setSelectedResolutionType={setSelectedResolutionType}
                    openModal={() => setShowModal(true)}
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

export const IndexTableRow: React.FunctionComponent<TableRowProps> = (props) => {
  const {
    services: { api },
    plugins: { reindexService },
  } = useAppContext();

  return (
    <IndexStatusProvider
      deprecation={props.deprecation}
      api={api}
      reindexService={reindexService.reindexService}
    >
      <IndexTableRowCells {...props} />
    </IndexStatusProvider>
  );
};
