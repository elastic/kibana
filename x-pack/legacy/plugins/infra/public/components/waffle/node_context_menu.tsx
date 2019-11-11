/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';
import { createUptimeLink } from './lib/create_uptime_link';
import { findInventoryModel } from '../../../common/inventory_models';

interface Props {
  options: InfraWaffleMapOptions;
  timeRange: InfraTimerangeInput;
  children: any;
  node: InfraWaffleMapNode;
  nodeType: InfraNodeType;
  isPopoverOpen: boolean;
  closePopover: () => void;
  uiCapabilities: UICapabilities;
  popoverPosition: EuiPopoverProps['anchorPosition'];
}

export const NodeContextMenu = injectUICapabilities(
  ({
    options,
    timeRange,
    children,
    node,
    isPopoverOpen,
    closePopover,
    nodeType,
    uiCapabilities,
    popoverPosition,
  }: Props) => {
    // Due to the changing nature of the fields between APM and this UI,
    // We need to have some exceptions until 7.0 & ECS is finalized. Reference
    // #26620 for the details for these fields.
    // TODO: This is tech debt, remove it after 7.0 & ECS migration.
    const APM_FIELDS = {
      [InfraNodeType.host]: 'host.hostname',
      [InfraNodeType.container]: 'container.id',
      [InfraNodeType.pod]: 'kubernetes.pod.uid',
      [InfraNodeType.awsEC2]: 'cloud.instance.id',
    };

    const inventoryModel = findInventoryModel(nodeType);

    const nodeLogsMenuItem = {
      name: i18n.translate('xpack.infra.nodeContextMenu.viewLogsName', {
        defaultMessage: 'View logs',
      }),
      href: getNodeLogsUrl({
        nodeType,
        nodeId: node.id,
        time: timeRange.to,
      }),
      'data-test-subj': 'viewLogsContextMenuItem',
    };

    const nodeDetailFrom = timeRange.to - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
    const nodeDetailMenuItem = {
      name: i18n.translate('xpack.infra.nodeContextMenu.viewMetricsName', {
        defaultMessage: 'View metrics',
      }),
      href: getNodeDetailUrl({
        nodeType,
        nodeId: node.id,
        from: nodeDetailFrom,
        to: timeRange.to,
      }),
    };

    const apmTracesMenuItem = {
      name: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
        defaultMessage: 'View {name} APM traces',
        values: { name: inventoryModel.displayName },
      }),
      href: `../app/apm#/traces?_g=()&kuery=${APM_FIELDS[nodeType]}:"${node.id}"`,
      'data-test-subj': 'viewApmTracesContextMenuItem',
    };

    const uptimeMenuItem = {
      name: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
        defaultMessage: 'View {name} in Uptime',
        values: { name: inventoryModel.displayName },
      }),
      href: createUptimeLink(options, nodeType, node),
    };

    const showLogsLink = node.id && uiCapabilities.logs.show;
    const showAPMTraceLink = uiCapabilities.apm && uiCapabilities.apm.show;
    const showUptimeLink =
      [InfraNodeType.pod, InfraNodeType.container].includes(nodeType) || node.ip;

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: [
          ...(showLogsLink ? [nodeLogsMenuItem] : []),
          nodeDetailMenuItem,
          ...(showAPMTraceLink ? [apmTracesMenuItem] : []),
          ...(showUptimeLink ? [uptimeMenuItem] : []),
        ],
      },
    ];

    return (
      <EuiPopover
        closePopover={closePopover}
        id={`${node.pathId}-popover`}
        isOpen={isPopoverOpen}
        button={children}
        panelPaddingSize="none"
        anchorPosition={popoverPosition}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="nodeContextMenu" />
      </EuiPopover>
    );
  }
);
