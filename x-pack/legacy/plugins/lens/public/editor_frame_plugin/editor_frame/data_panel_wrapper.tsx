/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, memo, useContext, useState } from 'react';
import {
  EuiSelect,
  EuiComboBox,
  EuiTitle,
  EuiButtonEmpty,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
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

  const [showDatasourceSwitcher, setDatasourceSwitcher] = useState(false);

  return (
    <>
      <EuiPopover
        id="datasource-switch"
        className="lnsDatasourceSwitch"
        button={
          <EuiButtonIcon
            aria-label="Switch to datasource"
            title="Switch to datasource"
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
          title="Switch to datasource"
          items={Object.keys(props.datasourceMap).map(datasourceId => (
            <EuiContextMenuItem
              key={datasourceId}
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
      {props.activeDatasource && !props.datasourceIsLoading && (
        <NativeRenderer
          className="lnsSidebarContainer"
          render={props.datasourceMap[props.activeDatasource].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
