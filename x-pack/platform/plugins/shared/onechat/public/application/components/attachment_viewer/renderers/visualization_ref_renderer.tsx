/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCodeBlock,
  EuiBadge,
  EuiLink,
  EuiIcon,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AttachmentContentProps } from '@kbn/onechat-browser/attachments';
import type { VisualizationRefAttachmentData } from '@kbn/onechat-common/attachments';
import type { CoreStart } from '@kbn/core/public';
import type { OnechatStartDependencies } from '../../../../types';
import { VisualizeLens } from '../../tools/esql/visualize_lens';

/**
 * Icons for different saved object types
 */
const SAVED_OBJECT_ICONS: Record<string, string> = {
  lens: 'lensApp',
  visualization: 'visualizeApp',
  map: 'gisApp',
};

/**
 * Content renderer for visualization_ref attachments.
 *
 * This renderer handles reference attachments that point to saved visualizations.
 * It supports two states:
 * 1. Resolved: Shows the visualization using the resolved content
 * 2. Unresolved: Shows the reference information with a link to the saved object
 */
export const VisualizationRefContentRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  const kibana = useKibana<CoreStart & { plugins: OnechatStartDependencies }>();
  const data = version.data as VisualizationRefAttachmentData & {
    resolved_content?: unknown;
    last_resolved_at?: string;
  };

  const { saved_object_id, saved_object_type, title, description, resolved_content } = data;

  // Build link to the saved object
  const savedObjectUrl = buildSavedObjectUrl(saved_object_type, saved_object_id, kibana);
  const iconType = SAVED_OBJECT_ICONS[saved_object_type] || 'document';

  // If we have resolved content, render the visualization
  if (resolved_content && typeof resolved_content === 'object') {
    const { lens, dataViews, uiActions } = kibana.services.plugins || {};

    // If dependencies aren't available, show reference info with resolved content as JSON
    if (!lens || !dataViews || !uiActions) {
      return (
        <ReferenceInfoWithFallback
          savedObjectType={saved_object_type}
          savedObjectId={saved_object_id}
          title={title}
          description={description}
          savedObjectUrl={savedObjectUrl}
          iconType={iconType}
          resolvedContent={resolved_content}
        />
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <ReferenceHeader
          savedObjectType={saved_object_type}
          savedObjectId={saved_object_id}
          title={title}
          savedObjectUrl={savedObjectUrl}
          iconType={iconType}
        />
        {description && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <VisualizeLens
            lensConfig={resolved_content as Record<string, unknown>}
            lens={lens}
            dataViews={dataViews}
            uiActions={uiActions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // No resolved content - show reference information
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <ReferenceHeader
        savedObjectType={saved_object_type}
        savedObjectId={saved_object_id}
        title={title}
        savedObjectUrl={savedObjectUrl}
        iconType={iconType}
      />
      {description && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiCallOut
          title={i18n.translate('xpack.onechat.attachments.visualizationRef.notResolved.title', {
            defaultMessage: 'Content not resolved',
          })}
          color="warning"
          iconType="alert"
          size="s"
        >
          <p>
            {i18n.translate('xpack.onechat.attachments.visualizationRef.notResolved.description', {
              defaultMessage:
                'This reference has not been resolved yet. Use the attachment_read tool to fetch the current content from the saved object.',
            })}
          </p>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Header component showing reference type badge and link to saved object
 */
const ReferenceHeader: React.FC<{
  savedObjectType: string;
  savedObjectId: string;
  title?: string;
  savedObjectUrl?: string;
  iconType: string;
}> = ({ savedObjectType, savedObjectId, title, savedObjectUrl, iconType }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType={iconType}>
            {i18n.translate('xpack.onechat.attachments.visualizationRef.typeBadge', {
              defaultMessage: '{type} Reference',
              values: { type: savedObjectType.charAt(0).toUpperCase() + savedObjectType.slice(1) },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {savedObjectUrl ? (
            <EuiLink href={savedObjectUrl} target="_blank" external>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={iconType} size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {title || savedObjectId}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="popout" size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          ) : (
            <EuiText size="s">
              <strong>{title || savedObjectId}</strong>
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

/**
 * Fallback component showing reference info with resolved content as JSON
 */
const ReferenceInfoWithFallback: React.FC<{
  savedObjectType: string;
  savedObjectId: string;
  title?: string;
  description?: string;
  savedObjectUrl?: string;
  iconType: string;
  resolvedContent: unknown;
}> = ({
  savedObjectType,
  savedObjectId,
  title,
  description,
  savedObjectUrl,
  iconType,
  resolvedContent,
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <ReferenceHeader
        savedObjectType={savedObjectType}
        savedObjectId={savedObjectId}
        title={title}
        savedObjectUrl={savedObjectUrl}
        iconType={iconType}
      />
      {description && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiCallOut
          title={i18n.translate('xpack.onechat.attachments.visualizationRef.fallback.title', {
            defaultMessage: 'Visualization dependencies not available',
          })}
          color="primary"
          iconType="iInCircle"
          size="s"
        >
          <p>
            {i18n.translate('xpack.onechat.attachments.visualizationRef.fallback.description', {
              defaultMessage: 'Displaying resolved content as JSON.',
            })}
          </p>
        </EuiCallOut>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiCodeBlock language="json" paddingSize="m" fontSize="s" isCopyable overflowHeight={400}>
          {JSON.stringify(resolvedContent, null, 2)}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Builds a URL to the saved object editor
 */
function buildSavedObjectUrl(
  savedObjectType: string,
  savedObjectId: string,
  kibana: ReturnType<typeof useKibana<CoreStart & { plugins: OnechatStartDependencies }>>
): string | undefined {
  const { http } = kibana.services;
  if (!http) {
    return undefined;
  }

  const basePath = http.basePath.get();

  switch (savedObjectType) {
    case 'lens':
      return `${basePath}/app/lens#/edit/${savedObjectId}`;
    case 'visualization':
      return `${basePath}/app/visualize#/edit/${savedObjectId}`;
    case 'map':
      return `${basePath}/app/maps#/map/${savedObjectId}`;
    default:
      return undefined;
  }
}
