/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { formatBytes } from '../../helpers/format_bytes';
import { isZeroAge } from '../../helpers/format_size_units';
import { LifecyclePhaseButton } from './lifecycle_phase_button';

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
  } = props;
  const isDelete = props.isDelete === true;

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
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle data-test-subj={`lifecyclePhase-${label}-popoverTitle`}>
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.streams.streamDetailLifecycle.phasePopoverTitleLabel', {
              defaultMessage: '{phase} phase',
              values: { phase: capitalize(label) },
            })}
          </EuiFlexItem>
          {isReadOnly && (
            <EuiFlexItem grow={false} data-test-subj={`lifecyclePhase-${label}-readOnly`}>
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
      </EuiPopoverTitle>
      <div style={{ width: '300px' }} data-test-subj={`lifecyclePhase-${label}-popoverContent`}>
        <EuiText size="s" data-test-subj={`lifecyclePhase-${label}-description`}>
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="s" />
        {(showStoredSize || showDocumentCount || showRetentionPeriod || showSearchableSnapshot) && (
          <>
            <EuiFlexGroup direction="column" gutterSize="none">
              {showRetentionPeriod && (
                <>
                  <EuiFlexItem data-test-subj={`lifecyclePhase-${label}-minAge`}>
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
                          data-test-subj={`lifecyclePhase-${label}-minAgeValue`}
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
                  <EuiFlexItem data-test-subj={`lifecyclePhase-${label}-storedSize`}>
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
                          data-test-subj={`lifecyclePhase-${label}-storedSizeValue`}
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
                <EuiFlexItem data-test-subj={`lifecyclePhase-${label}-docsCount`}>
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
                        data-test-subj={`lifecyclePhase-${label}-docsCountValue`}
                      >
                        {docsCount.toLocaleString()}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {showSearchableSnapshot && (
                <EuiPopoverFooter data-test-subj={`lifecyclePhase-${label}-searchableSnapshot`}>
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
                        data-test-subj={`lifecyclePhase-${label}-snapshotRepository`}
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
