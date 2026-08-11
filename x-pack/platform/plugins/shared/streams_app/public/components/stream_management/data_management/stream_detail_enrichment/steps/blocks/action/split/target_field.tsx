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
import type { SplitFormState } from '../../../../types';
import { isStepUnderEdit } from '../../../../state_management/steps_state_machine';
import { useInteractiveModeSelector } from '../../../../state_management/stream_enrichment_state_machine';

export const SplitTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<SplitFormState>();

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

      // Check for Mustache template syntax
      if (value?.includes('{{')) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.targetFieldMustacheError',
          {
            defaultMessage:
              "Mustache template syntax '{{' '}}' or '{{{' '}}}' is not allowed in field names",
          }
        );
      }

      if (isWithinWhereBlock) {
        if (!hasTargetField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldRequiredInWhereBlock',
            {
              defaultMessage:
                'For a split processor within a where block, the target field is required. Either set this field or move the processor to the root level.',
            }
          );
        }
        if (isEqualToSourceField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldCannotBeEqualToSourceFieldInWhereBlock',
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
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldRequiredWithCondition',
            {
              defaultMessage:
                'For a split processor with a defined condition, the target field is required. Either set this field or remove the processor condition.',
            }
          );
        }
        if (isEqualToSourceField) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldCannotBeEqualToSourceFieldWithCondition',
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
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitTargetFieldHelpText',
        {
          defaultMessage:
            'Output field for the resulting array. Leave empty to update the source field.',
        }
      )}
      isInvalid={Boolean(errors.to)}
      error={errors.to?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.to)} {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
