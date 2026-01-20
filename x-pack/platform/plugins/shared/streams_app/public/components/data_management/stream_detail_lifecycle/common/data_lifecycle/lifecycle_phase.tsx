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
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { formatBytes } from '../../helpers/format_bytes';
import { splitSizeAndUnits } from '../../helpers/format_size_units';
import { getInteractivePanelStyles } from './interactive_panel_styles';

const isZeroAge = (value?: string) => {
  if (!value) return false;
  const { size } = splitSizeAndUnits(value);
  const amount = Number(size);
  return Number.isFinite(amount) && amount === 0;
};

export interface LifecyclePhaseProps {
  color?: string;
  label?: string;
  size?: string;
  isDelete?: boolean;
  onClick?: () => void;
  phaseColorHover?: string;
  description?: string;
  sizeInBytes?: number;
  docsCount?: number;
  minAge?: string;
  isReadOnly?: boolean;
  searchableSnapshot?: string;
}

export const LifecyclePhase = ({
  color,
  label,
  size,
  isDelete = false,
  onClick,
  phaseColorHover,
  description,
  sizeInBytes,
  docsCount,
  minAge,
  isReadOnly = false,
  searchableSnapshot,
}: LifecyclePhaseProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const phaseColor = isDelete ? euiTheme.colors.backgroundBaseSubdued : color;

  const handleClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
    onClick?.();
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiPanel
      paddingSize="s"
      hasBorder={false}
      hasShadow={false}
      role="button"
      data-test-subj={isDelete ? 'lifecyclePhase-delete-button' : `lifecyclePhase-${label}-button`}
      aria-label={
        isDelete
          ? i18n.translate('xpack.streams.streamDetailLifecycle.deletePhase.ariaLabel', {
              defaultMessage: 'Delete phase',
            })
          : i18n.translate('xpack.streams.streamDetailLifecycle.phase.ariaLabel', {
              defaultMessage: '{phase} phase',
              values: { phase: label ?? '' },
            })
      }
      onClick={handleClick}
      css={getInteractivePanelStyles({
        euiTheme,
        backgroundColor: phaseColor ?? euiTheme.colors.backgroundBaseSubdued,
        hoverBackgroundColor: phaseColorHover ?? phaseColor,
        isPopoverOpen,
        minHeight: '50px',
        ...(isDelete
          ? {
              minWidth: '50px',
              padding: '0',
              alignCenter: true,
            }
          : {}),
      })}
      grow={false}
    >
      {isDelete ? (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          responsive={false}
          style={{ width: '100%', height: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="trash" data-test-subj="dataLifecycle-delete-icon" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          <EuiText
            size="xs"
            color={euiTheme.colors.plainDark}
            data-test-subj={`lifecyclePhase-${label}-name`}
          >
            <b>{capitalize(label)}</b>
          </EuiText>
          {size && (
            <EuiText
              size="xs"
              color={euiTheme.colors.plainDark}
              data-test-subj={`lifecyclePhase-${label}-size`}
            >
              {size}
            </EuiText>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );

  const showStoredSize = !isDelete && sizeInBytes !== undefined;
  const showDocumentCount = !isDelete && docsCount !== undefined;
  const showRetentionPeriod = label !== 'hot' && minAge !== undefined && !isZeroAge(minAge);
  const showSearchableSnapshot =
    !isDelete && (label === 'cold' || label === 'frozen') && searchableSnapshot !== undefined;

  return (
    <EuiPopover
      button={button}
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
              {showStoredSize && (
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
              {showDocumentCount && (
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
