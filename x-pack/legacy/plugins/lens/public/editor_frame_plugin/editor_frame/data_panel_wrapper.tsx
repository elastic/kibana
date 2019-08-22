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
import { DragContext } from '../../drag_drop';
import { StateSetter, SetState } from '../../types';
import { updateDatasourceState, switchDatasource } from '../../state_management';

interface DataPanelWrapperProps {
  datasourceState: unknown;
  datasourceMap: Record<string, Datasource>;
  activeDatasource: string | null;
  datasourceIsLoading: boolean;
  setState: SetState;
}

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const setDatasourceState: StateSetter<unknown> = useMemo(
    () => updater => {
      if (props.activeDatasource !== null) {
        updateDatasourceState(props.setState, updater, props.activeDatasource);
      }
    },
    [props.setState, props.activeDatasource]
  );

  const datasourceProps: DatasourceDataPanelProps = {
    dragDropContext: useContext(DragContext),
    state: props.datasourceState,
    setState: setDatasourceState,
  };

  const [showDatasourceSwitcher, setDatasourceSwitcher] = useState(false);

  return (
    <>
      {Object.keys(props.datasourceMap).length > 1 && (
        <EuiPopover
          id="datasource-switch"
          className="lnsDatasourceSwitch"
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
                  switchDatasource(props.setState, datasourceId);
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
          className="lnsSidebarContainer"
          render={props.datasourceMap[props.activeDatasource].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
