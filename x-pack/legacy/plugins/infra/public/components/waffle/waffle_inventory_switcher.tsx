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
import { i18n } from '@kbn/i18n';

import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  InfraSnapshotMetricInput,
  InfraSnapshotMetricType,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
} from '../../graphql/types';
import { findInventoryModel } from '../../../common/inventory_models';
import { InventoryItemType } from '../../../common/inventory_models/types';

interface Props {
  nodeType: InfraNodeType;
  changeNodeType: (nodeType: InfraNodeType) => void;
  changeGroupBy: (groupBy: InfraSnapshotGroupbyInput[]) => void;
  changeMetric: (metric: InfraSnapshotMetricInput) => void;
}

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const WaffleInventorySwitcher = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const openPopover = useCallback(() => setIsOpen(true), []);
  const goToNodeType = useCallback(
    (nodeType: InfraNodeType) => {
      closePopover();
      props.changeNodeType(nodeType);
      props.changeGroupBy([]);
      const inventoryModel = findInventoryModel(nodeType);
      props.changeMetric({
        type: inventoryModel.metrics.defaultSnapshot as InfraSnapshotMetricType,
      });
    },
    [props.changeGroupBy, props.changeNodeType, props.changeMetric]
  );
  const goToHost = useCallback(() => goToNodeType('host' as InfraNodeType), [goToNodeType]);
  const goToK8 = useCallback(() => goToNodeType('pod' as InfraNodeType), [goToNodeType]);
  const goToDocker = useCallback(() => goToNodeType('container' as InfraNodeType), [goToNodeType]);
  const goToAwsEC2 = useCallback(() => goToNodeType('awsEC2' as InfraNodeType), [goToNodeType]);
  const goToAwsS3 = useCallback(() => goToNodeType('awsS3' as InfraNodeType), [goToNodeType]);
  const goToAwsRDS = useCallback(() => goToNodeType('awsRDS' as InfraNodeType), [goToNodeType]);
  const goToAwsSQS = useCallback(() => goToNodeType('awsSQS' as InfraNodeType), [goToNodeType]);
  const panels = useMemo(
    () =>
      [
        {
          id: 'firstPanel',
          items: [
            {
              name: getDisplayNameForType('host'),
              icon: 'host',
              onClick: goToHost,
            },
            {
              name: getDisplayNameForType('pod'),
              icon: 'kubernetes',
              onClick: goToK8,
            },
            {
              name: getDisplayNameForType('container'),
              icon: 'docker',
              onClick: goToDocker,
            },
            {
              name: 'AWS',
              icon: 'aws',
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
    []
  );

  const selectedText = useMemo(() => {
    return getDisplayNameForType(props.nodeType);
  }, [props.nodeType]);

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
