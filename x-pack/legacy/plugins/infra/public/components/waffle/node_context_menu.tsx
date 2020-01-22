/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopoverProps, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import React, { useMemo } from 'react';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';
import { createUptimeLink } from './lib/create_uptime_link';
import { findInventoryModel } from '../../../common/inventory_models';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { InventoryItemType } from '../../../common/inventory_models/types';
import {
  ActionMenu,
  Section,
  SectionTitle,
  SectionSubtitle,
  SectionLinks,
  SectionLink,
  SectionLinkProps,
} from './action_menu';

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

  const inventoryId = useMemo(() => {
    switch (nodeType) {
      case 'host':
        if (node.ip) {
          return { label: <EuiCode>host.ip</EuiCode>, value: node.ip };
        } else {
          return { label: '', value: '' };
        }
      case 'pod':
        return { label: <EuiCode>pod.uid</EuiCode>, value: node.id };
      case 'container':
        return { label: <EuiCode>container.id</EuiCode>, value: node.id };
      case 'awsEC2':
      case 'awsRDS':
      case 'awsSQS':
      case 'awsS3':
        return { label: <EuiCode>instance.id</EuiCode>, value: node.id };
    }
  }, [nodeType, node]);

  const nodeLogsMenuItem: SectionLinkProps = {
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

  const nodeDetailMenuItem: SectionLinkProps = {
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

  const apmTracesMenuItem: SectionLinkProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
      defaultMessage: '{inventoryName} APM traces',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: `../app/apm#/traces?_g=()&kuery=${apmField}:"${node.id}"`,
    'data-test-subj': 'viewApmTracesContextMenuItem',
    isDisabled: !showAPMTraceLink,
  };

  const uptimeMenuItem: SectionLinkProps = {
    label: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
      defaultMessage: '{inventoryName} in Uptime',
      values: { inventoryName: inventoryModel.singularDisplayName },
    }),
    href: createUptimeLink(options, nodeType, node),
    isDisabled: !showUptimeLink,
  };

  return (
    <ActionMenu
      closePopover={closePopover}
      id={`${node.pathId}-popover`}
      isOpen={isPopoverOpen}
      button={children}
      anchorPosition={popoverPosition}
    >
      <Section>
        <SectionTitle>
          <FormattedMessage
            id={'xpack.infra.nodeContextMenu.title'}
            defaultMessage={'{inventoryName} details'}
            values={{ inventoryName: inventoryModel.singularDisplayName }}
          />
        </SectionTitle>
        {inventoryId.label && (
          <SectionSubtitle>
            <FormattedMessage
              id={'xpack.infra.nodeContextMenu.description'}
              defaultMessage={'View details for {label} {value}'}
              values={inventoryId}
            />
          </SectionSubtitle>
        )}
        <SectionLinks>
          <SectionLink
            label={nodeLogsMenuItem.label}
            href={nodeLogsMenuItem.href}
            isDisabled={nodeLogsMenuItem.isDisabled}
          />
          <SectionLink
            label={nodeDetailMenuItem.label}
            href={nodeDetailMenuItem.href}
            isDisabled={nodeDetailMenuItem.isDisabled}
          />
          <SectionLink
            label={apmTracesMenuItem.label}
            href={apmTracesMenuItem.href}
            isDisabled={apmTracesMenuItem.isDisabled}
          />
          <SectionLink
            label={uptimeMenuItem.label}
            href={uptimeMenuItem.href}
            isDisabled={uptimeMenuItem.isDisabled}
          />
        </SectionLinks>
      </Section>
    </ActionMenu>
  );
};
