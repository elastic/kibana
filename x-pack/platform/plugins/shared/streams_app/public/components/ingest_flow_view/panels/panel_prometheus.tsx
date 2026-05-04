/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';

type PrometheusScraperNode = Extract<FlowNode, { kind: 'prometheusScraper' }>;

interface PanelPrometheusProps {
  node: PrometheusScraperNode;
  onClose: () => void;
}

export const PanelPrometheus: React.FC<PanelPrometheusProps> = ({ node, onClose }) => {
  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelPrometheus.targetHost', {
        defaultMessage: 'Target host',
      }),
      description: node.targetHost,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelPrometheus.scrapeInterval', {
        defaultMessage: 'Scrape interval',
      }),
      description: `${node.scrapeIntervalSec}s`,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelPrometheus.status', {
        defaultMessage: 'Status',
      }),
      description: node.health?.status ?? 'unknown',
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelPrometheus.destinationKind', {
        defaultMessage: 'Destination',
      }),
      description: i18n.translate('xpack.streams.ingestFlow.panelPrometheus.destinationValue', {
        defaultMessage: 'Cloud pipeline / bulk endpoint',
      }),
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{node.label}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList listItems={listItems} type="column" columnWidths={[1, 2]} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="danger"
              iconType="trash"
              onClick={() => {
                // TODO: open PrometheusScraperEditFlyout in delete mode (workstream F)
                onClose();
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelPrometheus.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="pencil"
              onClick={() => {
                // TODO: open PrometheusScraperEditFlyout (workstream F)
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelPrometheus.editScraperButton', {
                defaultMessage: 'Edit scraper',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
