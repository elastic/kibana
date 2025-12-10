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
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface VersionNavigatorProps {
  /** Currently selected version number */
  currentVersion: number;
  /** Total number of versions */
  totalVersions: number;
  /** Whether navigation to previous version is possible */
  canGoBack: boolean;
  /** Whether navigation to next version is possible */
  canGoForward: boolean;
  /** Callback when previous version button is clicked */
  onPrevious: () => void;
  /** Callback when next version button is clicked */
  onNext: () => void;
}

/**
 * Navigation controls for stepping through attachment versions.
 * Shows previous/next buttons and current version indicator.
 */
export const VersionNavigator: React.FC<VersionNavigatorProps> = ({
  currentVersion,
  totalVersions,
  canGoBack,
  canGoForward,
  onPrevious,
  onNext,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.onechat.versionNavigator.previousTooltip', {
            defaultMessage: 'Previous version (v{version})',
            values: { version: currentVersion - 1 },
          })}
        >
          <EuiButtonIcon
            iconType="arrowLeft"
            onClick={onPrevious}
            disabled={!canGoBack}
            aria-label={i18n.translate('xpack.onechat.versionNavigator.previousAriaLabel', {
              defaultMessage: 'Go to previous version',
            })}
            size="s"
            data-test-subj="versionNavigatorPrevious"
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.onechat.versionNavigator.currentVersion', {
              defaultMessage: 'v{current} of {total}',
              values: { current: currentVersion, total: totalVersions },
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.onechat.versionNavigator.nextTooltip', {
            defaultMessage: 'Next version (v{version})',
            values: { version: currentVersion + 1 },
          })}
        >
          <EuiButtonIcon
            iconType="arrowRight"
            onClick={onNext}
            disabled={!canGoForward}
            aria-label={i18n.translate('xpack.onechat.versionNavigator.nextAriaLabel', {
              defaultMessage: 'Go to next version',
            })}
            size="s"
            data-test-subj="versionNavigatorNext"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
