/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
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
import { useKibana } from '../../../hooks/use_kibana';

type BulkEndpointNode = Extract<FlowNode, { kind: 'bulkEndpoint' }>;

interface PanelBulkEndpointProps {
  node: BulkEndpointNode;
  onClose: () => void;
}

export const PanelBulkEndpoint: React.FC<PanelBulkEndpointProps> = ({ node }) => {
  const {
    core: { application },
  } = useKibana();

  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.url', {
        defaultMessage: 'URL',
      }),
      description:
        node.url ??
        i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.defaultEndpoint', {
          defaultMessage: 'Default Elasticsearch endpoint',
        }),
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.description', {
        defaultMessage: 'Description',
      }),
      description: i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.descriptionValue', {
        defaultMessage: 'Accepts direct document ingestion via _bulk API',
      }),
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.title', {
              defaultMessage: 'Elasticsearch Bulk API',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList listItems={listItems} type="column" columnWidths={[1, 2]} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="popout"
              onClick={() =>
                application.navigateToApp('management', { path: '/security/api_keys' })
              }
            >
              {i18n.translate('xpack.streams.ingestFlow.panelBulkEndpoint.manageApiKeysButton', {
                defaultMessage: 'Manage API keys',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
