/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiCodeBlock,
  EuiToolTip,
  EuiText,
  EuiSpacer,
  EuiSplitPanel,
  EuiIcon,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';

import type { Pipeline } from '../../../../../common/types';

import { deprecatedPipelineBadge } from '../table';
import { PipelineDetailsJsonBlock } from '../details_json_block';
import { stringifyJson } from '../../../lib/utils';

export interface Props {
  pipeline: Pipeline;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  renderActions: boolean;
  renderViewTreeButton: boolean;
  onViewTreeClick: () => void;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    deleteAction: css`
      color: ${euiTheme.colors.dangerText};
    `,
    contextMenu: css`
      width: 150px;
    `,
  };
};

export const DetailsPanel: FunctionComponent<Props> = ({
  pipeline,
  onEditClick,
  onCloneClick,
  onDeleteClick,
  renderActions,
  renderViewTreeButton,
  onViewTreeClick,
}) => {
  const styles = useStyles();
  const [showPopover, setShowPopover] = useState(false);
  const popoverActions = [
    /**
     * Duplicate pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.duplicateActionLabel', {
        defaultMessage: 'Duplicate',
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
      css: styles.deleteAction,
    },
  ];

  const actionsPopoverButton = (
    <EuiButtonIcon
      display="base"
      size="m"
      data-test-subj="actionsPopoverButton"
      aria-label={i18n.translate(
        'xpack.ingestPipelines.list.pipelineDetails.popoverPipelineActionsAriaLabel',
        {
          defaultMessage: 'Other actions',
        }
      )}
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="boxesVertical"
    />
  );
  return (
    <EuiSplitPanel.Inner grow={true} paddingSize="none">
      <EuiSplitPanel.Outer hasShadow={false} grow={true} css={{ height: '100%' }}>
        <EuiSplitPanel.Inner style={{ overflowY: 'auto' }} paddingSize="l" grow={true}>
          <EuiTitle id="pipelineDetailsFlyoutTitle" data-test-subj="detailsPanelTitle">
            <h2>{pipeline.name}</h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiFlexGroup alignItems="center" gutterSize="m">
            {/* Pipeline version */}
            {pipeline.version && (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.versionTitle', {
                    defaultMessage: 'Version',
                  })}{' '}
                  {String(pipeline.version)}
                </EuiText>
              </EuiFlexItem>
            )}

            {/* Managed badge*/}
            {pipeline.isManaged && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.ingestPipelines.list.pipelineDetails.managedBadgeLabel',
                    { defaultMessage: 'Managed' }
                  )}
                  size="s"
                  color="hollow"
                />
              </EuiFlexItem>
            )}

            {/* Deprecated badge*/}
            {pipeline.deprecated && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={deprecatedPipelineBadge.badgeTooltip}>
                  <EuiBetaBadge
                    label={deprecatedPipelineBadge.badge}
                    size="s"
                    color="subdued"
                    data-test-subj="isDeprecatedBadge"
                    tabIndex={0}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiDescriptionList rowGutterSize="m">
            {/* Pipeline description */}
            {pipeline.description && (
              <>
                <EuiDescriptionListTitle />
                <EuiDescriptionListDescription>
                  {pipeline.description}
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
                  <EuiCodeBlock language="json">
                    {stringifyJson(pipeline._meta, false)}
                  </EuiCodeBlock>
                </EuiDescriptionListDescription>
              </>
            )}
          </EuiDescriptionList>
        </EuiSplitPanel.Inner>

        <EuiSplitPanel.Inner color="subdued" grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            {renderViewTreeButton && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onViewTreeClick}
                  flush="left"
                  data-test-subj="viewTreeButton"
                >
                  {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.viewTreeLabel', {
                    defaultMessage: 'View full hierarchy',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {renderActions && (
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                justifyContent="flexEnd"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="editPipelineButton"
                    aria-label={i18n.translate(
                      'xpack.ingestPipelines.list.pipelineDetails.editPipelineActionsAriaLabel',
                      {
                        defaultMessage: 'Edit pipeline',
                      }
                    )}
                    onClick={() => onEditClick(pipeline.name)}
                  >
                    {i18n.translate(
                      'xpack.ingestPipelines.list.pipelineDetails.editPipelineButtonLabel',
                      {
                        defaultMessage: 'Edit pipeline',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    isOpen={showPopover}
                    closePopover={() => setShowPopover(false)}
                    button={actionsPopoverButton}
                    panelPaddingSize="none"
                    repositionOnScroll
                  >
                    <EuiContextMenu
                      initialPanelId={0}
                      panels={[
                        {
                          id: 0,
                          items: popoverActions,
                        },
                      ]}
                      css={styles.contextMenu}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiSplitPanel.Inner>
  );
};
