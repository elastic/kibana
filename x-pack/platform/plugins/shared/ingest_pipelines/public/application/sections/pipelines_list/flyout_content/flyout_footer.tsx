/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Pipeline } from '../../../../../common/types';

export interface Props {
  pipeline: Pipeline;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  onClose: () => void;
}

export const FlyoutFooter = ({
  pipeline,
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}: Props) => {
  const { euiTheme } = useEuiTheme();

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
      css: { color: euiTheme.colors.dangerText },
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
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
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
                css={{ width: '150px' }}
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
