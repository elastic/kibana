/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import type { PropsWithChildren } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  ExpandableFlyout,
  type ExpandableFlyoutProps,
  useExpandableFlyoutApi,
  withExpandableFlyoutProvider,
} from '@kbn/expandable-flyout';
import { HostRightPanel, HostRightPanelProps } from '../../../flyout/panels';
import { HostDetailsButton } from './button';

export type HostCellWithFlyoutRendererProps = PropsWithChildren<DataGridCellValueElementProps>;

const HostCellWithFlyoutRendererComp = React.memo(function HostCellWithFlyoutRendererComp(
  props: HostCellWithFlyoutRendererProps
) {
  const hostName = getFieldValue(props.row, 'host.name');

  const { openFlyout } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openFlyout({
      right: {
        id: `host-panel-${hostName}-${props.rowIndex}`,
        params: {
          hostName,
        },
      } as HostRightPanelProps,
    });
  }, [openFlyout, hostName, props.rowIndex]);

  const panels: ExpandableFlyoutProps['registeredPanels'] = useMemo(() => {
    return [
      {
        key: `host-panel-${hostName}-${props.rowIndex}`,
        component: (panelProps) => {
          return <HostRightPanel {...(panelProps as HostRightPanelProps).params} />;
        },
      },
    ];
  }, [hostName, props.rowIndex]);

  return (
    <>
      <ExpandableFlyout
        data-test-subj="host-name-flyout"
        registeredPanels={panels}
        paddingSize="none"
      />
      <HostDetailsButton onClick={onClick}>{hostName}</HostDetailsButton>
    </>
  );
});

export const HostCellWithFlyoutRenderer = withExpandableFlyoutProvider(
  HostCellWithFlyoutRendererComp
);
