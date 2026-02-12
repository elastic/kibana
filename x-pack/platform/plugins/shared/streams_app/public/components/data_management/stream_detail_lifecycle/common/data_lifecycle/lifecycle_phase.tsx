/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { formatBytes } from '../../helpers/format_bytes';
import { LifecyclePhaseButton } from './lifecycle_phase_button';
import { isZeroAge } from '../../helpers/format_size_units';

interface BaseLifecyclePhaseProps {
  color?: string;
  description?: string;
  docsCount?: number;
  isReadOnly?: boolean;
  label: string;
  minAge?: string;
  onClick?: () => void;
  searchableSnapshot?: string;
  size?: string;
  sizeInBytes?: number;
  testSubjPrefix?: string;
  isIlm?: boolean;
  onRemovePhase?: (phaseName: string) => void;
  canManageLifecycle: boolean;
  isRemoveDisabled?: boolean;
  removeDisabledReason?: string;
}

interface DeleteLifecyclePhaseProps extends BaseLifecyclePhaseProps {
  isDelete: true;
}

interface StandardLifecyclePhaseProps extends BaseLifecyclePhaseProps {
  color: string;
  isDelete?: false;
}

export type LifecyclePhaseProps = DeleteLifecyclePhaseProps | StandardLifecyclePhaseProps;

export const LifecyclePhase = (props: LifecyclePhaseProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {
    color,
    description,
    docsCount,
    isReadOnly = false,
    label,
    minAge,
    onClick,
    searchableSnapshot,
    size,
    sizeInBytes,
    testSubjPrefix,
    isIlm = false,
    onRemovePhase,
    canManageLifecycle,
    isRemoveDisabled = false,
    removeDisabledReason,
  } = props;
  const isDelete = props.isDelete === true;
  const prefix = testSubjPrefix ? `${testSubjPrefix}-` : '';

  const phaseColor = isDelete ? euiTheme.colors.backgroundBaseSubdued : color;

  const handleClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
    onClick?.();
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  const showStoredSize = !isDelete && sizeInBytes !== undefined;
  const showDocumentCount = !isDelete && docsCount !== undefined;
  const showRetentionPeriod = label !== 'hot' && minAge !== undefined && !isZeroAge(minAge);
  const showSearchableSnapshot =
    !isDelete && (label === 'cold' || label === 'frozen') && searchableSnapshot !== undefined;

  return (
    <EuiPopover
      button={
        <LifecyclePhaseButton
          euiTheme={euiTheme}
          isDelete={isDelete}
          isPopoverOpen={isPopoverOpen}
          label={label}
          onClick={handleClick}
          phaseColor={phaseColor}
          size={size}
          testSubjPrefix={testSubjPrefix}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle data-test-subj={`${prefix}lifecyclePhase-${label}-popoverTitle`}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.streams.streamDetailLifecycle.phasePopoverTitleLabel', {
                  defaultMessage: '{phase} phase',
                  values: { phase: capitalize(label) },
                })}
              </EuiFlexItem>
              {isReadOnly && (
                <EuiFlexItem
                  grow={false}
                  data-test-subj={`${prefix}lifecyclePhase-${label}-readOnly`}
                >
                  <EuiIconTip
                    type="readOnly"
                    size="m"
                    content={i18n.translate('xpack.streams.streamDetailLifecycle.readOnlyTooltip', {
                      defaultMessage: 'Read only',
                    })}
                    aria-label={i18n.translate(
                      'xpack.streams.streamDetailLifecycle.readOnlyAriaLabel',
                      {
                        defaultMessage: 'Read only',
                      }
                    )}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {isIlm && label !== 'hot' && onRemovePhase && canManageLifecycle && (
            <EuiFlexItem grow={false}>
              {isRemoveDisabled && removeDisabledReason ? (
                <EuiToolTip content={removeDisabledReason}>
                  <EuiButtonIcon
                    iconType="trash"
                    size="s"
                    display="base"
                    color="danger"
                    isDisabled
                    aria-label={i18n.translate(
                      'xpack.streams.streamDetailLifecycle.removePhaseButton.ariaLabel',
                      {
                        defaultMessage: 'Remove {phase} phase',
                        values: { phase: label ?? '' },
                      }
                    )}
                    data-test-subj={`lifecyclePhase-${label}-removeButton`}
                  />
                </EuiToolTip>
              ) : (
                <EuiButtonIcon
                  iconType="trash"
                  size="s"
                  display="base"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.streams.streamDetailLifecycle.removePhaseButton.ariaLabel',
                    {
                      defaultMessage: 'Remove {phase} phase',
                      values: { phase: label ?? '' },
                    }
                  )}
                  data-test-subj={`lifecyclePhase-${label}-removeButton`}
                  onClick={() => {
                    closePopover();
                    onRemovePhase(label ?? '');
                  }}
                />
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div
        style={{ width: '300px' }}
        data-test-subj={`${prefix}lifecyclePhase-${label}-popoverContent`}
      >
        <EuiText size="s" data-test-subj={`${prefix}lifecyclePhase-${label}-description`}>
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="s" />
        {(showStoredSize || showDocumentCount || showRetentionPeriod || showSearchableSnapshot) && (
          <>
            <EuiFlexGroup direction="column" gutterSize="none">
              {showRetentionPeriod && (
                <>
                  <EuiFlexItem data-test-subj={`${prefix}lifecyclePhase-${label}-minAge`}>
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      gutterSize="none"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>
                            {i18n.translate('xpack.streams.streamDetailLifecycle.afterDataStored', {
                              defaultMessage: 'After data stored',
                            })}
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText
                          size="s"
                          textAlign="right"
                          data-test-subj={`${prefix}lifecyclePhase-${label}-minAgeValue`}
                        >
                          {minAge}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiSpacer size="s" />
                </>
              )}
              {showStoredSize && sizeInBytes !== undefined && (
                <>
                  <EuiFlexItem data-test-subj={`${prefix}lifecyclePhase-${label}-storedSize`}>
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      gutterSize="none"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>
                            {i18n.translate('xpack.streams.streamDetailLifecycle.storedSize', {
                              defaultMessage: 'Stored size',
                            })}
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText
                          size="s"
                          textAlign="right"
                          data-test-subj={`${prefix}lifecyclePhase-${label}-storedSizeValue`}
                        >
                          {formatBytes(sizeInBytes)}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiSpacer size="s" />
                </>
              )}
              {showDocumentCount && docsCount !== undefined && (
                <EuiFlexItem data-test-subj={`${prefix}lifecyclePhase-${label}-docsCount`}>
                  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>
                          {i18n.translate('xpack.streams.streamDetailLifecycle.documentCount', {
                            defaultMessage: 'Document count',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="s"
                        textAlign="right"
                        data-test-subj={`${prefix}lifecyclePhase-${label}-docsCountValue`}
                      >
                        {docsCount.toLocaleString()}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {showSearchableSnapshot && (
                <EuiPopoverFooter
                  data-test-subj={`${prefix}lifecyclePhase-${label}-searchableSnapshot`}
                >
                  <EuiText size="xs" color="subdued">
                    <strong>
                      {i18n.translate(
                        'xpack.streams.streamDetailLifecycle.searchableSnapshot.description',
                        {
                          defaultMessage: 'Searchable snapshot',
                        }
                      )}
                    </strong>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>
                          {i18n.translate(
                            'xpack.streams.streamDetailLifecycle.searchableSnapshot.snapshotRepository',
                            {
                              defaultMessage: 'Snapshot repository',
                            }
                          )}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="s"
                        textAlign="right"
                        data-test-subj={`${prefix}lifecyclePhase-${label}-snapshotRepository`}
                      >
                        {searchableSnapshot}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPopoverFooter>
              )}
            </EuiFlexGroup>
          </>
        )}
      </div>
    </EuiPopover>
  );
};
