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
  EuiToolTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentVersion } from '@kbn/onechat-common/attachments';

export interface VersionTimelineProps {
  /** All versions of the attachment */
  versions: AttachmentVersion[];
  /** Currently selected version number */
  selectedVersion: number;
  /** Callback when a version is selected */
  onVersionSelect: (version: number) => void;
}

interface TimelineNodeProps {
  version: AttachmentVersion;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}

const TimelineNode: React.FC<TimelineNodeProps> = ({
  version,
  isSelected,
  isFirst,
  isLast,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const nodeSize = isSelected ? '16px' : '12px';
  const nodeColor = version.status === 'deleted'
    ? euiTheme.colors.danger
    : isSelected
      ? euiTheme.colors.primary
      : euiTheme.colors.mediumShade;

  const formattedDate = new Date(version.created_at).toLocaleDateString();
  const formattedTime = new Date(version.created_at).toLocaleTimeString();

  const tooltipContent = (
    <div>
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.onechat.versionTimeline.versionLabel', {
            defaultMessage: 'Version {version}',
            values: { version: version.version },
          })}
        </strong>
        {version.status === 'deleted' && (
          <span style={{ color: euiTheme.colors.danger, marginLeft: '4px' }}>
            ({i18n.translate('xpack.onechat.versionTimeline.deleted', {
              defaultMessage: 'deleted',
            })})
          </span>
        )}
      </EuiText>
      <EuiText size="xs" color="subdued">
        {formattedDate} {formattedTime}
      </EuiText>
      {version.estimated_tokens && (
        <EuiText size="xs" color="subdued">
          ~{version.estimated_tokens} tokens
        </EuiText>
      )}
    </div>
  );

  const nodeStyles = css`
    width: ${nodeSize};
    height: ${nodeSize};
    border-radius: 50%;
    background-color: ${nodeColor};
    cursor: pointer;
    transition: all 0.2s ease;
    border: ${isSelected ? `2px solid ${euiTheme.colors.darkShade}` : 'none'};

    &:hover {
      transform: scale(1.2);
      box-shadow: 0 0 0 3px ${euiTheme.colors.lightShade};
    }
  `;

  const lineStyles = css`
    height: 2px;
    flex: 1;
    background-color: ${euiTheme.colors.lightShade};
    margin: 0 4px;
  `;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      {!isFirst && <div css={lineStyles} />}
      <EuiToolTip content={tooltipContent} position="top">
        <div
          css={nodeStyles}
          onClick={onClick}
          role="button"
          tabIndex={0}
          aria-label={i18n.translate('xpack.onechat.versionTimeline.nodeAriaLabel', {
            defaultMessage: 'Go to version {version}',
            values: { version: version.version },
          })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          data-test-subj={`versionTimelineNode-v${version.version}`}
        />
      </EuiToolTip>
      {!isLast && <div css={lineStyles} />}
    </EuiFlexGroup>
  );
};

/**
 * Visual timeline showing all versions of an attachment.
 * Allows clicking on nodes to jump to specific versions.
 */
export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  selectedVersion,
  onVersionSelect,
}) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    padding: ${euiTheme.size.s};
    background-color: ${euiTheme.colors.lightestShade};
    border-radius: ${euiTheme.border.radius.medium};
    width: 100%;
    overflow-x: auto;
  `;

  // Sort versions by version number (ascending)
  const sortedVersions = [...versions].sort((a, b) => a.version - b.version);

  return (
    <div css={containerStyles}>
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
        {sortedVersions.map((version, index) => (
          <EuiFlexItem key={version.version} grow={index === 0 || index === sortedVersions.length - 1 ? false : true}>
            <TimelineNode
              version={version}
              isSelected={version.version === selectedVersion}
              isFirst={index === 0}
              isLast={index === sortedVersions.length - 1}
              onClick={() => onVersionSelect(version.version)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {/* Version labels below the timeline */}
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">v1</EuiText>
        </EuiFlexItem>
        {versions.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">v{versions.length}</EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
