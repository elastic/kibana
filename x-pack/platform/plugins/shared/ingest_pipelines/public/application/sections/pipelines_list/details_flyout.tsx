/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiBadge,
  EuiCodeBlock,
  EuiToolTip,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';

import { deprecatedPipelineBadge } from './table';
import { PipelineDetailsJsonBlock } from './details_json_block';
import { stringifyJson } from '../../lib/utils';

export interface Props {
  pipeline: Pipeline;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  onClose: () => void;
}

export const PipelineDetailsFlyout: FunctionComponent<Props> = ({
  pipeline,
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const actionMenuItems = [
    /**
     * Edit pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.editActionLabel', {
        defaultMessage: 'Edit',
      }),
      icon: <EuiIcon type="pencil" />,
      onClick: () => onEditClick(pipeline.name),
    },
    /**
     * Clone pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.cloneActionLabel', {
        defaultMessage: 'Clone',
      }),
      icon: <EuiIcon type="copy" />,
      onClick: () => onCloneClick(pipeline.name),
    },
    /**
     * Delete pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.deleteActionLabel', {
        defaultMessage: 'Delete',
      }),
      icon: <EuiIcon type="trash" />,
      'data-test-subj': 'deletePipelineButton',
      onClick: () => {
        setShowPopover(false);
        onDeleteClick([pipeline]);
      },
    },
  ];

  const managePipelineButton = (
    <EuiButton
      data-test-subj="managePipelineButton"
      aria-label={i18n.translate(
        'xpack.ingestPipelines.list.pipelineDetails.managePipelineActionsAriaLabel',
        {
          defaultMessage: 'Manage pipeline',
        }
      )}
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="arrowUp"
      iconSide="right"
      fill
    >
      {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.managePipelineButtonLabel', {
        defaultMessage: 'Manage',
      })}
    </EuiButton>
  );

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      data-test-subj="pipelineDetails"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle id="pipelineDetailsFlyoutTitle" data-test-subj="title">
              <h2>{pipeline.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {pipeline.deprecated ? (
            <EuiFlexItem grow={false}>
              {' '}
              <EuiToolTip content={deprecatedPipelineBadge.badgeTooltip}>
                <EuiBadge color="warning" data-test-subj="isDeprecatedBadge">
                  {deprecatedPipelineBadge.badge}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
          {pipeline.isManaged ? (
            <EuiFlexItem grow={false}>
              {' '}
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.ingestPipelines.list.pipelineDetails.managedBadgeLabel"
                  defaultMessage="Managed"
                />
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList>
          {/* Pipeline description */}
          {pipeline.description && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.descriptionTitle', {
                  defaultMessage: 'Description',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{pipeline.description}</EuiDescriptionListDescription>
            </>
          )}

          {/* Pipeline version */}
          {pipeline.version && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.versionTitle', {
                  defaultMessage: 'Version',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {String(pipeline.version)}
              </EuiDescriptionListDescription>
            </>
          )}

          {/* Processors JSON */}
          <EuiDescriptionListTitle>
            {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
              defaultMessage: 'Processors',
            })}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <PipelineDetailsJsonBlock json={pipeline.processors} />
          </EuiDescriptionListDescription>

          {/* On Failure Processor JSON */}
          {pipeline.on_failure?.length && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate(
                  'xpack.ingestPipelines.list.pipelineDetails.failureProcessorsTitle',
                  {
                    defaultMessage: 'Failure processors',
                  }
                )}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <PipelineDetailsJsonBlock json={pipeline.on_failure} />
              </EuiDescriptionListDescription>
            </>
          )}

          {/* Metadata (optional) */}
          {pipeline._meta && (
            <>
              <EuiDescriptionListTitle data-test-subj="metaTitle">
                <FormattedMessage
                  id="xpack.ingestPipelines.list.pipelineDetails.metaDescriptionListTitle"
                  defaultMessage="Metadata"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiCodeBlock language="json">{stringifyJson(pipeline._meta, false)}</EuiCodeBlock>
              </EuiDescriptionListDescription>
            </>
          )}
        </EuiDescriptionList>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="closeDetailsFlyout"
            >
              {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={showPopover}
                closePopover={() => setShowPopover(false)}
                button={managePipelineButton}
                panelPaddingSize="none"
                repositionOnScroll
              >
                <EuiContextMenu
                  initialPanelId={0}
                  data-test-subj="autoFollowPatternActionContextMenu"
                  panels={[
                    {
                      id: 0,
                      title: i18n.translate(
                        'xpack.ingestPipelines.list.pipelineDetails.managePipelinePanelTitle',
                        {
                          defaultMessage: 'Pipeline options',
                        }
                      ),
                      items: actionMenuItems,
                    },
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
