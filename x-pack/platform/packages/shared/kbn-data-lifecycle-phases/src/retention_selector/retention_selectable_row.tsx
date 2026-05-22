/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiListGroupItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiListGroupItemExtraActionProps } from '@elastic/eui';
import type { RetentionOption } from './types';
import { getRetentionSelectableRowStyles } from './styles';

const TEST_SUBJ_SANITIZE_REGEX = /[^a-zA-Z0-9]+/g;

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
  onSelect: () => void;
  onInspect?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  showSelectionIcon?: boolean;
  showInspectAction?: boolean;
  inspectPlacement?: 'rowAction' | 'badge';
}

export const RetentionSelectableRow = ({
  option,
  searchValue,
  inspectButtonLabel,
  onSelect,
  onInspect,
  isSelected = false,
  isDisabled = false,
  showSelectionIcon = true,
  showInspectAction = true,
  inspectPlacement = 'rowAction',
}: RetentionSelectableRowProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getRetentionSelectableRowStyles({ euiTheme });

  const iconType = showSelectionIcon ? (isSelected ? 'check' : 'empty') : undefined;
  const safeOptionNameForTestSubj = option.name.replace(TEST_SUBJ_SANITIZE_REGEX, '_');
  const rowTestSubj = `retentionSelectableRow-${safeOptionNameForTestSubj}`;
  const inspectTestSubj = `retentionSelectableRowInspect-${safeOptionNameForTestSubj}`;
  const shouldShowInspectInBadge =
    inspectPlacement === 'badge' && option.inspectable && option.badge && onInspect;

  const extraAction: EuiListGroupItemExtraActionProps | undefined =
    !shouldShowInspectInBadge && option.inspectable && showInspectAction && onInspect
      ? {
          alwaysShow: true,
          'aria-label': inspectButtonLabel,
          color: 'text',
          iconType: 'inspect',
          'data-test-subj': inspectTestSubj,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onInspect();
          },
          disabled: isDisabled,
        }
      : undefined;

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
    <EuiListGroupItem
      color="text"
      iconType={iconType}
      isDisabled={isDisabled}
      onClick={onSelect}
      extraAction={extraAction}
      css={styles.item}
      data-test-subj={rowTestSubj}
      label={
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
      }
    />
  );
};
