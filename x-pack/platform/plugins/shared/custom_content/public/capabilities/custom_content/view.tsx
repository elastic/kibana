/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ESQLColumn } from '@kbn/es-types';
import { CustomContentFrame, useTemplateHtml } from '@kbn/custom-content-renderer';
import type {
  CapabilitySourceState as CustomAppSourceState,
  CapabilityViewProps as CustomAppCapabilityViewProps,
} from '@kbn/custom-app-registry';
import type { CustomContentNode } from '../../../common/capabilities/custom_content/manifest';

type SourceData = Extract<CustomAppSourceState, { status: 'success' }>['data'];

const NO_DATA: SourceData = { columns: [], rows: [] };

const TemplateFrame = ({ node, data }: { node: CustomContentNode; data: SourceData }) => {
  const rendered = useTemplateHtml(node.template ?? '', {
    columns: data.columns as ESQLColumn[],
    rows: data.rows,
  });

  if (!rendered) return <EuiSkeletonText lines={2} isLoading />;
  if ('error' in rendered) {
    return (
      <KbnDangerCallout
        size="s"
        announceOnMount={false}
        title={i18n.translate('xpack.customContent.customApp.errorTitle', {
          defaultMessage: 'This template cannot be shown',
        })}
      >
        <p>{rendered.error}</p>
      </KbnDangerCallout>
    );
  }

  return (
    <CustomContentFrame
      html={rendered.html}
      autoHeight={{ fallback: node.height, testSubj: 'customAppCustomContentMeasure' }}
      data-test-subj="customAppCustomContentFrame"
    />
  );
};

const WithData = ({
  node,
  source,
  retry,
}: {
  node: CustomContentNode;
  source: CustomAppSourceState;
  retry: () => void;
}) => {
  switch (source.status) {
    case 'loading':
      return <EuiSkeletonText lines={2} isLoading />;
    case 'error':
      return (
        <KbnDangerCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.customContent.customApp.dataErrorTitle', {
            defaultMessage: 'Unable to load data',
          })}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.customContent.customApp.retry', {
                defaultMessage: 'Retry',
              }),
              onClick: retry,
            },
          }}
        >
          <p>{source.message}</p>
        </KbnDangerCallout>
      );
    case 'success':
      return <TemplateFrame node={node} data={source.data} />;
  }
};

export const CustomContentView = ({
  node,
  source,
  retry,
}: CustomAppCapabilityViewProps<CustomContentNode>) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="none" data-node-id={node.id}>
    {node.query && source ? (
      <WithData node={node} source={source} retry={retry} />
    ) : (
      <TemplateFrame node={node} data={NO_DATA} />
    )}
  </EuiPanel>
);
