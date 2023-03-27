/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { ChartLegendItem } from './chart_legend_item';
import { getEcsCompliantColor } from '../../data_quality_panel/tabs/helpers';
import {
  ECS_COMPLIANT_TAB_ID,
  CUSTOM_TAB_ID,
  INCOMPATIBLE_TAB_ID,
} from '../../data_quality_panel/index_properties/helpers';
import { getCustomColor } from '../../data_quality_panel/tabs/custom_tab/helpers';
import { getIncompatibleColor } from '../../data_quality_panel/tabs/incompatible_tab/helpers';
import type { PartitionedFieldMetadata } from '../../types';
import * as i18n from '../../data_quality_panel/index_properties/translations';

const ChartLegendFlexGroup = styled(EuiFlexGroup)`
  width: 210px;
`;

interface Props {
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
}

const ChartLegendComponent: React.FC<Props> = ({ partitionedFieldMetadata, setSelectedTabId }) => {
  const showIncompatibleTab = useCallback(
    () => setSelectedTabId(INCOMPATIBLE_TAB_ID),
    [setSelectedTabId]
  );

  const showCustomTab = useCallback(() => setSelectedTabId(CUSTOM_TAB_ID), [setSelectedTabId]);

  const showEcsCompliantTab = useCallback(
    () => setSelectedTabId(ECS_COMPLIANT_TAB_ID),
    [setSelectedTabId]
  );

  return (
    <ChartLegendFlexGroup direction="column" gutterSize="none">
      {partitionedFieldMetadata.incompatible.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getIncompatibleColor()}
            count={partitionedFieldMetadata.incompatible.length}
            onClick={showIncompatibleTab}
            text={i18n.INCOMPATIBLE_FIELDS}
          />
        </EuiFlexItem>
      )}

      {partitionedFieldMetadata.custom.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getCustomColor(partitionedFieldMetadata)}
            count={partitionedFieldMetadata.custom.length}
            onClick={showCustomTab}
            text={i18n.CUSTOM_FIELDS}
          />
        </EuiFlexItem>
      )}

      {partitionedFieldMetadata.ecsCompliant.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getEcsCompliantColor(partitionedFieldMetadata)}
            count={partitionedFieldMetadata.ecsCompliant.length}
            onClick={showEcsCompliantTab}
            text={i18n.ECS_COMPLIANT_FIELDS}
          />
        </EuiFlexItem>
      )}
    </ChartLegendFlexGroup>
  );
};

ChartLegendComponent.displayName = 'ChartLegendComponent';

export const ChartLegend = React.memo(ChartLegendComponent);
