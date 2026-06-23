/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { classifyFileListing } from '../../../common/utils/file_system_results';
import { isLikelyAccessDenied } from './access_denied_heuristic';
import { useListDirectory } from './use_list_directory';
import type { FileRow } from './use_list_directory';
import { useFileActionsAuthz } from './use_file_actions_authz';
import { FileActionsMenu } from './file_actions_menu';
import type { HostCapability } from './use_host_capability';

export interface TreeNode {
  path: string;
  filename: string;
  isDirectory: boolean;
  /** File size in bytes (from the osquery `file` table), when reported. */
  size?: string;
  /** Last-modified time as a Unix epoch-seconds string, when reported. */
  mtime?: string;
}

const buildNodes = (rows: FileRow[]): TreeNode[] =>
  rows.map((row) => ({
    path: row.path ?? '',
    filename: row.filename ?? row.path?.split('/').pop() ?? row.path ?? '',
    isDirectory: row.type === 'directory',
    size: row.size,
    mtime: row.mtime,
  }));

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Formats a byte count string into a compact human-readable size (e.g. `2.4 MB`). */
const formatSize = (size: string | undefined): string | undefined => {
  if (size == null || size === '') return undefined;
  let bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return undefined;

  let unit = 0;
  while (bytes >= 1024 && unit < BYTE_UNITS.length - 1) {
    bytes /= 1024;
    unit += 1;
  }

  // No decimals for plain bytes; one decimal for KB and above.
  return `${unit === 0 ? bytes : bytes.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

/** Formats a Unix epoch-seconds string into a locale date-time, or undefined. */
const formatMtime = (mtime: string | undefined): string | undefined => {
  if (mtime == null || mtime === '') return undefined;
  const seconds = Number(mtime);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  return new Date(seconds * 1000).toLocaleString();
};

interface DirectoryTreeNodeProps {
  agentId: string;
  node: TreeNode;
  depth: number;
  capability?: HostCapability;
}

const INDENT_PX = 16;

const getFileNodeStyle = (depth: number) => ({ paddingLeft: depth * INDENT_PX });
const getRowStyle = (depth: number) => ({ paddingLeft: depth * INDENT_PX, cursor: 'pointer' });
const getChildrenIndentStyle = (depth: number) => ({ paddingLeft: (depth + 1) * INDENT_PX });

const DISCOVER_LINK = (
  <EuiLink href="/app/discover" target="_blank">
    <FormattedMessage
      id="xpack.osquery.fileSystem.tree.truncated.discoverLink"
      defaultMessage="Discover"
    />
  </EuiLink>
);

export const DirectoryTreeNode = React.memo<DirectoryTreeNodeProps>(
  ({ agentId, node, depth, capability }) => {
    const [expanded, setExpanded] = useState(false);
    const [hasExpanded, setHasExpanded] = useState(false);

    const { rows, total, isLoading, isError, refetch } = useListDirectory({
      agentId,
      path: node.path,
      enabled: hasExpanded,
    });

    const handleToggle = useCallback(() => {
      if (!expanded) {
        setHasExpanded(true);
      }

      setExpanded((prev) => !prev);
    }, [expanded]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleToggle();
        }
      },
      [handleToggle]
    );

    const handleRefresh = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        refetch();
      },
      [refetch]
    );

    const fileListingResult = useMemo(() => {
      if (!hasExpanded || isLoading) return null;

      return classifyFileListing({
        rows,
        total,
        errored: isError,
        likelyAccessDenied: isLikelyAccessDenied(node.path),
      });
    }, [hasExpanded, isLoading, rows, total, isError, node.path]);

    const childNodes = useMemo(
      () => (fileListingResult?.state === 'ok' ? buildNodes(fileListingResult.rows) : []),
      [fileListingResult]
    );

    const fileNodeStyle = useMemo(() => getFileNodeStyle(depth), [depth]);
    const rowStyle = useMemo(() => getRowStyle(depth), [depth]);
    const childrenIndentStyle = useMemo(() => getChildrenIndentStyle(depth), [depth]);

    const truncatedValues = useMemo(() => ({ ceiling: 10000, discoverLink: DISCOVER_LINK }), []);

    const authz = useFileActionsAuthz(capability);

    if (!node.isDirectory) {
      const sizeLabel = formatSize(node.size);
      const mtimeLabel = formatMtime(node.mtime);

      return (
        <div style={fileNodeStyle}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="document" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="m">{node.filename}</EuiText>
            </EuiFlexItem>
            {sizeLabel && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued" data-test-subj="fileSize">
                  {sizeLabel}
                </EuiText>
              </EuiFlexItem>
            )}
            {mtimeLabel && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued" data-test-subj="fileMtime">
                  {mtimeLabel}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <FileActionsMenu
                agentId={agentId}
                endpointId={capability?.endpointId ?? ''}
                path={node.path}
                authz={authz}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      );
    }

    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          style={rowStyle}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          data-test-subj={`directoryNode-${node.path}`}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={expanded ? 'arrowDown' : 'arrowRight'} size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type={expanded ? 'folderOpen' : 'folder'} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="m">{node.filename}</EuiText>
            </EuiFlexItem>
            {expanded && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <FormattedMessage
                      id="xpack.osquery.fileSystem.tree.refreshTooltip"
                      defaultMessage="Refresh this directory"
                    />
                  }
                >
                  <EuiButtonIcon
                    aria-label="Refresh directory"
                    iconType="refresh"
                    size="xs"
                    onClick={handleRefresh}
                    data-test-subj={`refreshNode-${node.path}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>

        {expanded && (
          <div data-test-subj={`directoryChildren-${node.path}`}>
            {isLoading && (
              <div style={childrenIndentStyle}>
                <EuiLoadingSpinner size="s" />
              </div>
            )}

            {!isLoading && fileListingResult?.state === 'empty' && (
              <div style={childrenIndentStyle}>
                <EuiText size="m" color="subdued" data-test-subj="directoryEmpty">
                  <FormattedMessage
                    id="xpack.osquery.fileSystem.tree.emptyDirectory"
                    defaultMessage="Empty directory"
                  />
                </EuiText>
              </div>
            )}

            {!isLoading && fileListingResult?.state === 'access_denied' && (
              <div style={childrenIndentStyle} data-test-subj="accessDenied">
                <EuiText size="m" color="warning">
                  <EuiIcon type="lock" size="m" />{' '}
                  <FormattedMessage
                    id="xpack.osquery.fileSystem.tree.accessDenied"
                    defaultMessage="Access denied — the agent may lack Full Disk Access (macOS TCC) for this path."
                  />
                </EuiText>
              </div>
            )}

            {!isLoading && fileListingResult?.state === 'error' && (
              <div style={childrenIndentStyle} data-test-subj="directoryError">
                <EuiCallOut
                  size="s"
                  color="danger"
                  iconType="warning"
                  title={
                    <FormattedMessage
                      id="xpack.osquery.fileSystem.tree.errorTitle"
                      defaultMessage="Could not list directory"
                    />
                  }
                >
                  <FormattedMessage
                    id="xpack.osquery.fileSystem.tree.errorBody"
                    defaultMessage="The host may be offline or the query timed out."
                  />
                </EuiCallOut>
              </div>
            )}

            {!isLoading && fileListingResult?.state === 'ok' && fileListingResult.truncated && (
              <div style={childrenIndentStyle} data-test-subj="truncatedHint">
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.osquery.fileSystem.tree.truncated"
                    defaultMessage="Results are truncated at {ceiling} entries. Use {discoverLink} to explore all files."
                    values={truncatedValues}
                  />
                </EuiText>
              </div>
            )}

            {!isLoading &&
              fileListingResult?.state === 'ok' &&
              childNodes.map((child) => (
                <DirectoryTreeNode
                  key={child.path}
                  agentId={agentId}
                  node={child}
                  depth={depth + 1}
                  capability={capability}
                />
              ))}
          </div>
        )}
      </div>
    );
  }
);

DirectoryTreeNode.displayName = 'DirectoryTreeNode';
