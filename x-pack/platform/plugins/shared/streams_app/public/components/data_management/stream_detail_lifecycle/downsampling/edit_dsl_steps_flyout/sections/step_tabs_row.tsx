/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiTextColor,
  EuiToolTip,
  useEuiOverflowScroll,
} from '@elastic/eui';

import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { MAX_DOWNSAMPLE_STEPS } from '../form';
import { useStyles } from '../use_styles';

export interface StepTabsRowProps {
  items: ArrayItem[];
  selectedStepIndex: number | undefined;
  setSelectedStepIndex: (index: number) => void;
  onAddStep: () => void;
  isAddDisabled: boolean;
  tabHasErrors: (stepPath: string) => boolean;
  dataTestSubj: string;
}

export const StepTabsRow = ({
  items,
  selectedStepIndex,
  setSelectedStepIndex,
  onAddStep,
  isAddDisabled,
  tabHasErrors,
  dataTestSubj,
}: StepTabsRowProps) => {
  const tabsScrollCss = useEuiOverflowScroll('x', true);
  const { tabsContainerStyles } = useStyles();

  const tabs = useMemo(() => {
    return items.map((item, index) => {
      const hasErrors = tabHasErrors(item.path);
      const label = i18n.translate('xpack.streams.editDslStepsFlyout.stepTabLabel', {
        defaultMessage: 'Step {stepNumber}',
        values: { stepNumber: index + 1 },
      });

      return (
        <EuiTab
          key={item.id}
          onClick={() => setSelectedStepIndex(index)}
          isSelected={index === selectedStepIndex}
          data-test-subj={`${dataTestSubj}Tab-step-${index + 1}`}
          prepend={hasErrors ? <EuiIcon type="warning" color="danger" size="m" /> : undefined}
        >
          {hasErrors ? <EuiTextColor color="danger">{label}</EuiTextColor> : label}
        </EuiTab>
      );
    });
  }, [dataTestSubj, items, selectedStepIndex, setSelectedStepIndex, tabHasErrors]);

  const addButton = (
    <EuiButtonIcon
      display="empty"
      iconType="plus"
      aria-label={i18n.translate('xpack.streams.editDslStepsFlyout.addStepAriaLabel', {
        defaultMessage: 'Add downsampling step',
      })}
      size="xs"
      color="primary"
      data-test-subj={`${dataTestSubj}AddTabButton`}
      onClick={onAddStep}
      disabled={isAddDisabled}
    />
  );

  const renderAddButton = () => {
    if (!isAddDisabled) return addButton;
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.streams.editDslStepsFlyout.maxStepsTooltip', {
          defaultMessage: 'Maximum of {max} downsampling steps',
          values: { max: MAX_DOWNSAMPLE_STEPS },
        })}
      >
        <span tabIndex={0}>{addButton}</span>
      </EuiToolTip>
    );
  };

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false} css={[tabsContainerStyles, tabsScrollCss]}>
        <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{renderAddButton()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
