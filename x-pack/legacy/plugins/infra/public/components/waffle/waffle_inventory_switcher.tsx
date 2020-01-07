/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPopover,
  EuiContextMenu,
  EuiFilterButton,
  EuiFilterGroup,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';

import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { findInventoryModel } from '../../../common/inventory_models';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { SnapshotMetricInput, SnapshotGroupBy } from '../../../common/http_api/snapshot_api';

interface WaffleInventorySwitcherProps {
  nodeType: InventoryItemType;
  changeNodeType: (nodeType: InventoryItemType) => void;
  changeGroupBy: (groupBy: SnapshotGroupBy) => void;
  changeMetric: (metric: SnapshotMetricInput) => void;
}

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const WaffleInventorySwitcher: React.FC<WaffleInventorySwitcherProps> = ({
  changeNodeType,
  changeGroupBy,
  changeMetric,
  nodeType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const openPopover = useCallback(() => setIsOpen(true), []);
  const goToNodeType = useCallback(
    (targetNodeType: InventoryItemType) => {
      closePopover();
      changeNodeType(targetNodeType);
      changeGroupBy([]);
      const inventoryModel = findInventoryModel(targetNodeType);
      changeMetric({
        type: inventoryModel.metrics.defaultSnapshot,
      });
    },
    [closePopover, changeNodeType, changeGroupBy, changeMetric]
  );
  const goToHost = useCallback(() => goToNodeType('host'), [goToNodeType]);
  const goToK8 = useCallback(() => goToNodeType('pod'), [goToNodeType]);
  const goToDocker = useCallback(() => goToNodeType('container'), [goToNodeType]);
  const goToAwsEC2 = useCallback(() => goToNodeType('awsEC2'), [goToNodeType]);
  const goToAwsS3 = useCallback(() => goToNodeType('awsS3'), [goToNodeType]);
  const goToAwsRDS = useCallback(() => goToNodeType('awsRDS'), [goToNodeType]);
  const goToAwsSQS = useCallback(() => goToNodeType('awsSQS'), [goToNodeType]);
  const panels = useMemo(
    () =>
      [
        {
          id: 'firstPanel',
          items: [
            {
              name: getDisplayNameForType('host'),
              onClick: goToHost,
            },
            {
              name: getDisplayNameForType('pod'),
              onClick: goToK8,
            },
            {
              name: getDisplayNameForType('container'),
              onClick: goToDocker,
            },
            {
              name: 'AWS',
              panel: 'awsPanel',
            },
          ],
        },
        {
          id: 'awsPanel',
          title: 'AWS',
          items: [
            {
              name: getDisplayNameForType('awsEC2'),
              onClick: goToAwsEC2,
            },
            {
              name: getDisplayNameForType('awsS3'),
              onClick: goToAwsS3,
            },
            {
              name: getDisplayNameForType('awsRDS'),
              onClick: goToAwsRDS,
            },
            {
              name: getDisplayNameForType('awsSQS'),
              onClick: goToAwsSQS,
            },
          ],
        },
      ] as EuiContextMenuPanelDescriptor[],
    [goToAwsEC2, goToAwsRDS, goToAwsS3, goToAwsSQS, goToDocker, goToHost, goToK8]
  );

  const selectedText = useMemo(() => {
    return getDisplayNameForType(nodeType);
  }, [nodeType]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        id="contextMenu"
        button={
          <EuiFilterButton iconType="arrowDown" onClick={openPopover}>
            <FormattedMessage
              id="xpack.infra.waffle.inventoryButtonLabel"
              defaultMessage="View: {selectedText}"
              values={{ selectedText }}
            />
          </EuiFilterButton>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId="firstPanel" panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
