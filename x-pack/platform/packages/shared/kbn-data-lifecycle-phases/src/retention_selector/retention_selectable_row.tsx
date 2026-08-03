/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { RetentionOption } from './types';
import { getRetentionSelectableRowStyles } from './styles';

const TEST_SUBJ_SANITIZE_REGEX = /[^a-zA-Z0-9]+/g;

export const getRetentionSelectableRowTestSubjs = (name: string) => {
  const safeOptionNameForTestSubj = name.replace(TEST_SUBJ_SANITIZE_REGEX, '_');
  return {
    rowTestSubj: `retentionSelectableRow-${safeOptionNameForTestSubj}`,
    inspectTestSubj: `retentionSelectableRowInspect-${safeOptionNameForTestSubj}`,
  };
};

const formatDescriptionLine = ({
  descriptionCategory,
  descriptionParts,
}: {
  descriptionCategory?: string;
  descriptionParts?: string[];
}) => {
  const joined = (descriptionParts ?? []).join(' · ');
  if (!descriptionCategory) return joined;
  if (!joined) return `${descriptionCategory}:`;
  return `${descriptionCategory}: ${joined}`;
};

interface RetentionSelectableRowProps {
  option: RetentionOption;
  searchValue: string;
  inspectButtonLabel: string;
  inspectTestSubj: string;
  onInspect?: () => void;
  isDisabled?: boolean;
  inspectPlacement?: 'rowAction' | 'badge';
}

export const RetentionSelectableRow = ({
  option,
  searchValue,
  inspectButtonLabel,
  inspectTestSubj,
  onInspect,
  isDisabled = false,
  inspectPlacement = 'rowAction',
}: RetentionSelectableRowProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getRetentionSelectableRowStyles({ euiTheme });
  const shouldShowInspectInBadge =
    inspectPlacement === 'badge' && option.inspectable && option.badge && onInspect;

  const descriptionLine1 = formatDescriptionLine({
    descriptionCategory: option.descriptionCategory,
    descriptionParts: option.descriptionParts ?? [],
  });

  const shouldRenderDescriptionLine2 =
    Boolean(option.descriptionCategorySecondLine) ||
    Boolean(option.descriptionPartsSecondLine?.length);

  const descriptionLine2 = shouldRenderDescriptionLine2
    ? formatDescriptionLine({
        descriptionCategory: option.descriptionCategorySecondLine,
        descriptionParts: option.descriptionPartsSecondLine ?? [],
      })
    : undefined;

  const onInspectBadgeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onInspect?.();
    }
  };

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem css={styles.nameColumn}>
          <EuiText size="s">
            <EuiHighlight search={searchValue} css={styles.nameText}>
              {option.name}
            </EuiHighlight>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem css={styles.nameColumn}>
          <EuiText size="xs" color="subdued">
            {descriptionLine1}
          </EuiText>
        </EuiFlexItem>
        {shouldShowInspectInBadge && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                responsive={false}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-label={inspectButtonLabel}
                aria-disabled={isDisabled}
                data-test-subj={inspectTestSubj}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isDisabled) return;
                  onInspect?.();
                }}
                onKeyDown={onInspectBadgeKeyDown}
              >
                <EuiFlexItem grow={false}>{option.badge}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="inspect" aria-hidden={true} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {descriptionLine2 && (
        <EuiText size="xs" color="subdued">
          {descriptionLine2}
        </EuiText>
      )}
    </>
  );
};

export const RetentionSelectableInspectButton = ({
  inspectButtonLabel,
  inspectTestSubj,
  onInspect,
  isDisabled,
}: {
  inspectButtonLabel: string;
  inspectTestSubj: string;
  onInspect: () => void;
  isDisabled?: boolean;
}) => (
  <EuiToolTip content={inspectButtonLabel} disableScreenReaderOutput>
    <EuiButtonIcon
      aria-label={inspectButtonLabel}
      color="text"
      iconType="inspect"
      data-test-subj={inspectTestSubj}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onInspect();
      }}
      disabled={isDisabled}
    />
  </EuiToolTip>
);
