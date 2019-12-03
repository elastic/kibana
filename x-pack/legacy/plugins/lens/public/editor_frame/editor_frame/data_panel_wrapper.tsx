/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, memo, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { DatasourceDataPanelProps, Datasource } from '../../../public';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import { DragContext } from '../../drag_drop';
import { StateSetter, FramePublicAPI } from '../../types';
import { Query, esFilters } from '../../../../../../../src/plugins/data/public';

interface DataPanelWrapperProps {
  datasourceState: unknown;
  datasourceMap: Record<string, Datasource>;
  activeDatasource: string | null;
  datasourceIsLoading: boolean;
  dispatch: (action: Action) => void;
  core: DatasourceDataPanelProps['core'];
  query: Query;
  dateRange: FramePublicAPI['dateRange'];
  filters: esFilters.Filter[];
}

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const setDatasourceState: StateSetter<unknown> = useMemo(
    () => updater => {
      props.dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        updater,
        datasourceId: props.activeDatasource!,
        clearStagedPreview: true,
      });
    },
    [props.dispatch, props.activeDatasource]
  );

  const datasourceProps: DatasourceDataPanelProps = {
    dragDropContext: useContext(DragContext),
    state: props.datasourceState,
    setState: setDatasourceState,
    core: props.core,
    query: props.query,
    dateRange: props.dateRange,
    filters: props.filters,
  };

  const [showDatasourceSwitcher, setDatasourceSwitcher] = useState(false);

  return (
    <>
      {Object.keys(props.datasourceMap).length > 1 && (
        <EuiPopover
          id="datasource-switch"
          className="lnsDataPanelWrapper__switchSource"
          button={
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
                defaultMessage: 'Switch to datasource',
              })}
              title={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
                defaultMessage: 'Switch to datasource',
              })}
              data-test-subj="datasource-switch"
              onClick={() => setDatasourceSwitcher(true)}
              iconType="gear"
            />
          }
          isOpen={showDatasourceSwitcher}
          closePopover={() => setDatasourceSwitcher(false)}
          panelPaddingSize="none"
          anchorPosition="rightUp"
        >
          <EuiContextMenuPanel
            title={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
              defaultMessage: 'Switch to datasource',
            })}
            items={Object.keys(props.datasourceMap).map(datasourceId => (
              <EuiContextMenuItem
                key={datasourceId}
                data-test-subj={`datasource-switch-${datasourceId}`}
                icon={props.activeDatasource === datasourceId ? 'check' : 'empty'}
                onClick={() => {
                  setDatasourceSwitcher(false);
                  props.dispatch({
                    type: 'SWITCH_DATASOURCE',
                    newDatasourceId: datasourceId,
                  });
                }}
              >
                {datasourceId}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      )}
      {props.activeDatasource && !props.datasourceIsLoading && (
        <NativeRenderer
          className="lnsDataPanelWrapper"
          render={props.datasourceMap[props.activeDatasource].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
