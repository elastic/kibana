/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import { useToolService } from '../../../hooks/tools/use_tools';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { DetailPanelLayout } from '../common/detail_panel_layout';

interface ToolDetailPanelProps {
  toolId: string;
  onRemove: () => void;
  isAutoIncluded: boolean;
  canEditAgent: boolean;
}

export const ToolDetailPanel: React.FC<ToolDetailPanelProps> = ({
  toolId,
  onRemove,
  isAutoIncluded,
  canEditAgent,
}) => {
  const { euiTheme } = useEuiTheme();
  const { tool, isLoading } = useToolService(toolId);
  const isReadOnly = tool?.readonly ?? false;

  return (
    <DetailPanelLayout
      isLoading={isLoading}
      isEmpty={!tool}
      title={tool?.id ?? toolId}
      showAutoIcon={isAutoIncluded}
      headerContent={
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-top: ${euiTheme.size.xs};
          `}
        >
          {tool?.id}
        </EuiText>
      }
      headerActions={(openConfirmRemove) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <ToolHeaderActions
            toolId={toolId}
            openConfirmRemove={openConfirmRemove}
            canEditAgent={canEditAgent}
            isReadOnly={isReadOnly}
            isAutoIncluded={isAutoIncluded}
          />
        </EuiFlexGroup>
      )}
      confirmRemove={{
        title: labels.agentTools.removeToolConfirmTitle(tool?.id ?? toolId),
        body: labels.agentTools.removeToolConfirmBody,
        confirmButtonText: labels.agentTools.removeToolConfirmButton,
        cancelButtonText: labels.agentTools.removeToolCancelButton,
        onConfirm: onRemove,
      }}
    >
      <div
        css={css`
          padding: ${euiTheme.size.l};
        `}
      >
        <EuiTitle size="xxxs">
          <h4>{labels.agentTools.toolDetailDescriptionLabel}</h4>
        </EuiTitle>
        <EuiText
          size="s"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          {tool?.description || '\u2014'}
        </EuiText>
      </div>
    </DetailPanelLayout>
  );
};

const ToolHeaderActions = ({
  openConfirmRemove,
  canEditAgent,
  isReadOnly,
  isAutoIncluded,
  toolId,
}: {
  openConfirmRemove: () => void;
  canEditAgent: boolean;
  isReadOnly: boolean;
  isAutoIncluded: boolean;
  toolId: string;
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const editInLibraryUrl = createAgentBuilderUrl(appPaths.manage.toolDetails({ toolId }));

  if (isAutoIncluded) {
    return (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{labels.agentTools.autoIncludedBadgeLabel}</EuiBadge>
      </EuiFlexItem>
    );
  }
  if (!canEditAgent) {
    return null;
  }

  return (
    <>
      {isReadOnly ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="lock">
            {labels.agentTools.readOnlyBadge}
          </EuiBadge>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiLink href={editInLibraryUrl} target="_blank" external>
            {labels.agentTools.editInLibraryLink}
          </EuiLink>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty iconType="cross" size="xs" color="danger" onClick={openConfirmRemove}>
          {labels.agentTools.removeToolButtonLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
};
