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

import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';

import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';
import { TRANSFORM_FUNCTION, type TransformFunction } from '../../../../../../common/constants';
import type { TransformCapabilities } from '../../../../../../common/types/capabilities';

import { useTransformCapabilities } from '../../../../hooks';

const createTransformButtonLabel = i18n.translate(
  'xpack.transform.transformList.createTransformButton',
  {
    defaultMessage: 'Create transform',
  }
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

const isCreateTransformDisabled = (
  capabilities: Pick<
    TransformCapabilities,
    'canCreateTransform' | 'canPreviewTransform' | 'canStartStopTransform'
  >,
  transformNodes: number
): boolean => getCreateTransformDisabledReason(capabilities, transformNodes) !== undefined;

const getCreateTransformDisabledReason = (
  capabilities: Pick<
    TransformCapabilities,
    'canCreateTransform' | 'canPreviewTransform' | 'canStartStopTransform'
  >,
  transformNodes: number
):
  | 'noTransformNodes'
  | 'canCreateTransform'
  | 'canPreviewTransform'
  | 'canStartStopTransform'
  | undefined => {
  if (transformNodes === 0) {
    return 'noTransformNodes';
  }
  if (!capabilities.canCreateTransform) {
    return 'canCreateTransform';
  }
  if (!capabilities.canPreviewTransform) {
    return 'canPreviewTransform';
  }
  if (!capabilities.canStartStopTransform) {
    return 'canStartStopTransform';
  }
  return undefined;
};

const getCreateTransformFailureMessage = (
  capabilities: Pick<
    TransformCapabilities,
    'canCreateTransform' | 'canPreviewTransform' | 'canStartStopTransform'
  >,
  transformNodes: number
): string | undefined => {
  const reason = getCreateTransformDisabledReason(capabilities, transformNodes);
  return reason === undefined ? undefined : createCapabilityFailureMessage(reason);
};

export const getCreateTransformPrimaryActionItem = ({
  onClick,
  transformNodes,
  capabilities,
}: {
  onClick: (transformFunction: TransformFunction) => void;
  transformNodes: number;
  capabilities: Pick<
    TransformCapabilities,
    'canCreateTransform' | 'canPreviewTransform' | 'canStartStopTransform'
  >;
}): NonNullable<AppHeaderMenu['primaryActionItem']> => {
  const disabled = isCreateTransformDisabled(capabilities, transformNodes);
  const tooltipContent = getCreateTransformFailureMessage(capabilities, transformNodes);

  if (disabled) {
    return {
      id: 'createTransform',
      label: createTransformButtonLabel,
      iconType: 'plusCircle',
      testId: 'transformButtonCreate',
      disableButton: true,
      tooltipContent,
      run: () => undefined,
    };
  }

  return {
    id: 'createTransform',
    label: createTransformButtonLabel,
    iconType: 'plusCircle',
    testId: 'transformButtonCreate',
    popoverTestId: 'transformCreatePopover',
    popoverWidth: 250,
    items: [
      {
        id: 'createPivot',
        label: pivotTitle,
        description: pivotDescription,
        iconType: 'aggregate',
        testId: 'transformCreatePivotButton',
        run: () => onClick(TRANSFORM_FUNCTION.PIVOT),
      },
      {
        id: 'createLatest',
        label: latestTitle,
        description: latestDescription,
        iconType: 'clock',
        testId: 'transformCreateLatestButton',
        run: () => onClick(TRANSFORM_FUNCTION.LATEST),
      },
    ],
  };
};

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

  const disabled = isCreateTransformDisabled(capabilities, transformNodes);

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
      iconSide="right"
      iconType="chevronSingleDown"
      data-test-subj="transformButtonCreate"
    >
      {label ?? createTransformButtonLabel}
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={getCreateTransformFailureMessage(capabilities, transformNodes)}
      >
        {createTransformButton}
      </EuiToolTip>
    );
  }

  const getTransformTypeOptionName = (title: string, description: string, iconType: string) => (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{title}</EuiText>
        <EuiText color="subdued" size="xs">
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
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
