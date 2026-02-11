/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isAlwaysCondition } from '@kbn/streamlang';
import type { ConvertFormState } from '../../../../types';
import { isStepUnderEdit } from '../../../../state_management/steps_state_machine';
import { useInteractiveModeSelector } from '../../../../state_management/stream_enrichment_state_machine';

export const TargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ConvertFormState>();

  const isWithinWhereBlock = useInteractiveModeSelector((state) => {
    const stepUnderEdit = state.context.stepRefs.find((stepRef) =>
      isStepUnderEdit(stepRef.getSnapshot())
    );
    return stepUnderEdit ? stepUnderEdit.getSnapshot().context.step.parentId !== null : false;
  });

  const { ref, ...inputProps } = register('to', {
    validate: (value, formValues) => {
      const hasTargetField = Boolean(value?.trim());
      const isEqualToSourceField = value?.trim() === formValues.from?.trim();

      if (isWithinWhereBlock) {
        if (!hasTargetField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTargetFieldRequiredInWhereBlock',
            {
              defaultMessage:
                'For a convert processor within a where block, the target field is required. Either set this field or move the processor at the root level.',
            }
          );
        }
        if (isEqualToSourceField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTargetFieldCannotBeEqualToSourceFieldInWhereBlock',
            {
              defaultMessage:
                'The target field cannot be the same as the source field in a where block.',
            }
          );
        }
      }

      if (
        'where' in formValues &&
        formValues.where !== undefined &&
        !isAlwaysCondition(formValues.where)
      ) {
        if (!hasTargetField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTargetFieldRequiredWithCondition',
            {
              defaultMessage:
                'For a convert processor with a defined condition, the target field is required. Either set this field or remove the processor condition.',
            }
          );
        }
        if (isEqualToSourceField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTargetFieldCannotBeEqualToSourceFieldWithCondition',
            {
              defaultMessage:
                'The target field cannot be the same as the source field when a condition is defined.',
            }
          );
        }
      }
      return true;
    },
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldHelpText',
        { defaultMessage: 'Output field. If empty, the input field is updated in place.' }
      )}
      isInvalid={Boolean(errors.to)}
      error={errors.to?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.to)} {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
