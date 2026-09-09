/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type ReactNode, useCallback, useState } from 'react';

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';
import { TRANSFORM_FUNCTION, type TransformFunction } from '../../../../../../common/constants';

import { useTransformCapabilities } from '../../../../hooks';

interface CreateTransformButtonProps {
  label?: ReactNode;
  onClick: (transformFunction: TransformFunction) => void;
  transformNodes: number;
}

export const CreateTransformButton: FC<CreateTransformButtonProps> = ({
  label,
  onClick,
  transformNodes,
}) => {
  const capabilities = useTransformCapabilities();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform ||
    transformNodes === 0;

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onSelectTransformFunction = useCallback(
    (transformFunction: TransformFunction) => {
      closePopover();
      onClick(transformFunction);
    },
    [closePopover, onClick]
  );

  const createTransformButton = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
      iconType="plusCircle"
      data-test-subj="transformButtonCreate"
    >
      {label ?? (
        <FormattedMessage
          id="xpack.transform.transformList.createTransformButton"
          defaultMessage="Create a transform"
        />
      )}
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createCapabilityFailureMessage(
          transformNodes > 0 ? 'canCreateTransform' : 'noTransformNodes'
        )}
      >
        {createTransformButton}
      </EuiToolTip>
    );
  }

  const getTransformTypeOptionName = (title: string, description: string, iconType: string) => (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="l" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="m">{title}</EuiText>
        <EuiText color="subdued" size="s">
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const pivotTitle = i18n.translate('xpack.transform.transformList.createPivotTransformButton', {
    defaultMessage: 'Pivot',
  });
  const pivotDescription = i18n.translate(
    'xpack.transform.transformList.createPivotTransformDescription',
    {
      defaultMessage: 'Aggregate and group your data',
    }
  );
  const latestTitle = i18n.translate('xpack.transform.transformList.createLatestTransformButton', {
    defaultMessage: 'Latest',
  });
  const latestDescription = i18n.translate(
    'xpack.transform.transformList.createLatestTransformDescription',
    {
      defaultMessage: 'Keep track of your most recent data',
    }
  );

  const panels = [
    {
      id: 0,
      items: [
        {
          name: getTransformTypeOptionName(pivotTitle, pivotDescription, 'aggregate'),
          onClick: () => onSelectTransformFunction(TRANSFORM_FUNCTION.PIVOT),
          'data-test-subj': 'transformCreatePivotButton',
        },
        {
          name: getTransformTypeOptionName(latestTitle, latestDescription, 'clock'),
          onClick: () => onSelectTransformFunction(TRANSFORM_FUNCTION.LATEST),
          'data-test-subj': 'transformCreateLatestButton',
        },
      ],
    },
  ];

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      button={createTransformButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      data-test-subj="transformCreatePopover"
    >
      <>
        <EuiPopoverTitle id={popoverTitleId} paddingSize="m">
          {i18n.translate('xpack.transform.transformList.createTransformTypePopoverTitle', {
            defaultMessage: 'Select transform type',
          })}
        </EuiPopoverTitle>
        <EuiContextMenu initialPanelId={0} panels={panels} css={{ minWidth: 350 }} />
      </>
    </EuiPopover>
  );
};
