/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, memo, useContext } from 'react';
import { EuiSelect } from '@elastic/eui';
import { DatasourceDataPanelProps, Datasource } from '../../../public';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import { DragContext } from '../../drag_drop';

interface DataPanelWrapperProps {
  datasourceState: unknown;
  datasourceMap: Record<string, Datasource>;
  activeDatasource: string | null;
  datasourceIsLoading: boolean;
  dispatch: (action: Action) => void;
}

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const setDatasourceState = useMemo(
    () => (newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        newState,
      });
    },
    [props.dispatch]
  );

  const datasourceProps: DatasourceDataPanelProps = {
    dragDropContext: useContext(DragContext),
    state: props.datasourceState,
    setState: setDatasourceState,
  };

  return (
    <>
      <EuiSelect
        data-test-subj="datasource-switch"
        options={Object.keys(props.datasourceMap).map(datasourceId => ({
          value: datasourceId,
          text: datasourceId,
        }))}
        value={props.activeDatasource || undefined}
        onChange={e => {
          props.dispatch({ type: 'SWITCH_DATASOURCE', newDatasourceId: e.target.value });
        }}
      />
      {props.activeDatasource && !props.datasourceIsLoading && (
        <NativeRenderer
          render={props.datasourceMap[props.activeDatasource].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
