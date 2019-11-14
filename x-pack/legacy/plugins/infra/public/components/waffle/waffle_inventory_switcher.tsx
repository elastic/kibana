/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover, EuiContextMenu, EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
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

interface Props {
  nodeType: InfraNodeType;
  changeNodeType: (nodeType: InfraNodeType) => void;
  changeGroupBy: (groupBy: InfraSnapshotGroupbyInput[]) => void;
  changeMetric: (metric: InfraSnapshotMetricInput) => void;
}

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
  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('xpack.infra.waffle.nodeTypeSwitcher.hostsLabel', {
              defaultMessage: 'Hosts',
            }),
            icon: 'host',
            onClick: goToHost,
          },
          {
            name: 'Kubernetes',
            icon: 'kubernetes',
            onClick: goToK8,
          },
          {
            name: 'Docker',
            icon: 'docker',
            onClick: goToDocker,
          },
        ],
      },
    ],
    []
  );
  const selectedText = useMemo(() => {
    switch (props.nodeType) {
      case InfraNodeType.host:
        return i18n.translate('xpack.infra.waffle.nodeTypeSwitcher.hostsLabel', {
          defaultMessage: 'Hosts',
        });
      case InfraNodeType.pod:
        return 'Kubernetes';
      case InfraNodeType.container:
        return 'Docker';
    }
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
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
