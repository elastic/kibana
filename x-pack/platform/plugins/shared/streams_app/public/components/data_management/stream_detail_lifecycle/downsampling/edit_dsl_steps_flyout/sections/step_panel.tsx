/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { TimeUnit } from '../form';
import { AfterField, FixedIntervalField } from '../form';
import { useStyles } from '../use_styles';

export interface StepPanelProps {
  item: ArrayItem;
  stepIndex: number;
  selectedStepIndex: number | undefined;
  onRemoveStep: (stepIndex: number) => void;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
}

export const StepPanel = ({
  item,
  stepIndex,
  selectedStepIndex,
  onRemoveStep,
  dataTestSubj,
  timeUnitOptions,
}: StepPanelProps) => {
  const isHidden = selectedStepIndex !== stepIndex;
  const stepNumber = stepIndex + 1;
  const { sectionStyles } = useStyles();

  return (
    <div hidden={isHidden} aria-hidden={isHidden}>
      <div css={sectionStyles}>
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          responsive={false}
          data-test-subj={`${dataTestSubj}Panel-step-${stepIndex}`}
        >
          <EuiFlexItem grow={false}>
            <AfterField item={item} dataTestSubj={dataTestSubj} timeUnitOptions={timeUnitOptions} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FixedIntervalField
              item={item}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={timeUnitOptions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <>
        <EuiHorizontalRule margin="none" />
        <div css={sectionStyles}>
          <EuiButton
            color="danger"
            size="s"
            data-test-subj={`${dataTestSubj}RemoveStepButton-step-${stepNumber}`}
            onClick={() => onRemoveStep(stepIndex)}
          >
            {i18n.translate('xpack.streams.editDslStepsFlyout.removeStep', {
              defaultMessage: 'Remove step {stepNumber}',
              values: { stepNumber },
            })}
          </EuiButton>
        </div>
      </>
    </div>
  );
};
