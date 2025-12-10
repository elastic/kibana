/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentVersion } from '@kbn/onechat-common/attachments';

export interface VersionSelectorProps {
  /** All versions of the attachment */
  versions: AttachmentVersion[];
  /** Currently selected version number */
  selectedVersion: number;
  /** Callback when a version is selected */
  onVersionSelect: (version: number) => void;
  /** Whether the selector should be compressed */
  compressed?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Dropdown selector for choosing attachment versions.
 * Shows version metadata including status, date, and token count.
 */
export const VersionSelector: React.FC<VersionSelectorProps> = ({
  versions,
  selectedVersion,
  onVersionSelect,
  compressed = true,
  disabled = false,
}) => {
  const options = useMemo(() => {
    // Sort versions by version number (descending - newest first)
    const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

    return sortedVersions.map((version) => {
      const formattedDate = new Date(version.created_at).toLocaleDateString();
      const formattedTime = new Date(version.created_at).toLocaleTimeString();
      const isDeleted = version.status === 'deleted';
      const isLatest = version.version === Math.max(...versions.map((v) => v.version));

      return {
        value: String(version.version),
        inputDisplay: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <strong>v{version.version}</strong>
            </EuiFlexItem>
            {isDeleted && (
              <EuiFlexItem grow={false}>
                <EuiIcon type="trash" color="danger" size="s" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        dropdownDisplay: (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>v{version.version}</strong>
                  </EuiText>
                </EuiFlexItem>

                {isLatest && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">
                      {i18n.translate('xpack.onechat.versionSelector.latest', {
                        defaultMessage: 'Latest',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}

                {isDeleted && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">
                      {i18n.translate('xpack.onechat.versionSelector.deleted', {
                        defaultMessage: 'Deleted',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {formattedDate} {formattedTime}
                  </EuiText>
                </EuiFlexItem>

                {version.estimated_tokens && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      ~{version.estimated_tokens} tokens
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, [versions]);

  const handleChange = (value: string) => {
    onVersionSelect(parseInt(value, 10));
  };

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={String(selectedVersion)}
      onChange={handleChange}
      compressed={compressed}
      disabled={disabled}
      data-test-subj="versionSelector"
      aria-label={i18n.translate('xpack.onechat.versionSelector.ariaLabel', {
        defaultMessage: 'Select version',
      })}
    />
  );
};
