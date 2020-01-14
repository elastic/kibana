/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopoverProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';
import { createUptimeLink } from './lib/create_uptime_link';
import { findInventoryModel } from '../../../common/inventory_models';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { ActionMenu } from './action_menu';

interface Props {
  options: InfraWaffleMapOptions;
  currentTime: number;
  children: any;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
  isPopoverOpen: boolean;
  closePopover: () => void;
  popoverPosition: EuiPopoverProps['anchorPosition'];
}

export const NodeContextMenu = ({
  options,
  currentTime,
  children,
  node,
  isPopoverOpen,
  closePopover,
  nodeType,
  popoverPosition,
}: Props) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const inventoryModel = findInventoryModel(nodeType);
  const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
  // Due to the changing nature of the fields between APM and this UI,
  // We need to have some exceptions until 7.0 & ECS is finalized. Reference
  // #26620 for the details for these fields.
  // TODO: This is tech debt, remove it after 7.0 & ECS migration.
  const apmField = nodeType === 'host' ? 'host.hostname' : inventoryModel.fields.id;

  const showDetail = inventoryModel.crosslinkSupport.details;
  const showLogsLink =
    inventoryModel.crosslinkSupport.logs && node.id && uiCapabilities?.logs?.show;
  const showAPMTraceLink =
    inventoryModel.crosslinkSupport.apm && uiCapabilities?.apm && uiCapabilities?.apm.show;
  const showUptimeLink =
    inventoryModel.crosslinkSupport.uptime && (['pod', 'container'].includes(nodeType) || node.ip);

  const nodeLogsMenuItem: EuiListGroupItemProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewLogsName', {
      defaultMessage: '{inventoryName} logs',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: getNodeLogsUrl({
      nodeType,
      nodeId: node.id,
      time: currentTime,
    }),
    'data-test-subj': 'viewLogsContextMenuItem',
    isDisabled: !showLogsLink,
  };

  const nodeDetailMenuItem: EuiListGroupItemProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewMetricsName', {
      defaultMessage: '{inventoryName} metrics',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: getNodeDetailUrl({
      nodeType,
      nodeId: node.id,
      from: nodeDetailFrom,
      to: currentTime,
    }),
    isDisabled: !showDetail,
  };

  const apmTracesMenuItem: EuiListGroupItemProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
      defaultMessage: '{inventoryName} APM traces',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: `../app/apm#/traces?_g=()&kuery=${apmField}:"${node.id}"`,
    'data-test-subj': 'viewApmTracesContextMenuItem',
    isDisabled: !showAPMTraceLink,
  };

  const uptimeMenuItem: EuiListGroupItemProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
      defaultMessage: '{inventoryName} in Uptime',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: createUptimeLink(options, nodeType, node),
    isDisabled: !showUptimeLink,
  };

  return (
    <ActionMenu
      sections={[
        {
          title: i18n.translate('xpack.infra.nodeContextMenu.title', {
            defaultMessage: `${inventoryModel.singularDisplayName} details`,
            values: { inventoryName: inventoryModel.singularDisplayName },
          }),
          description: i18n.translate('xpack.infra.nodeContextMenu.description', {
            defaultMessage:
              'View logs, metrics and traces of this {inventoryName} to get further details',
            values: { inventoryName: inventoryModel.singularDisplayName },
          }),
          links: [nodeLogsMenuItem, nodeDetailMenuItem, apmTracesMenuItem, uptimeMenuItem],
        },
      ]}
      closePopover={closePopover}
      id={`${node.pathId}-popover`}
      isOpen={isPopoverOpen}
      button={children}
      anchorPosition={popoverPosition}
    />
  );
};
