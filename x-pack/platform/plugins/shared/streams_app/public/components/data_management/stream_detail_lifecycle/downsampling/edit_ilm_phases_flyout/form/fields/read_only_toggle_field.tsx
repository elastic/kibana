/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../types';

export interface ReadOnlyToggleFieldProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: PhaseName | undefined;
  dataTestSubj: string;
  allowedPhases: ReadonlyArray<PhaseName>;
}

export const ReadOnlyToggleField = ({
  form,
  phaseName,
  dataTestSubj,
  allowedPhases,
}: ReadOnlyToggleFieldProps) => {
  const watchPath = phaseName ? `_meta.${phaseName}.readonlyEnabled` : `_meta.hot.readonlyEnabled`;

  const checkboxId = useGeneratedHtmlId({
    prefix: `${dataTestSubj}ReadOnlyCheckbox-${phaseName}`,
  });

  useFormData({ form, watch: watchPath });

  if (!phaseName) return null;
  const readonlyAllowed = allowedPhases.includes(phaseName);
  if (!readonlyAllowed) return null;

  const path = `_meta.${phaseName}.readonlyEnabled`;
  const field = form.getFields()[path];
  if (!field) return null;

  const readonlyValue = Boolean(field.value);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={checkboxId}
          checked={readonlyValue}
          label={i18n.translate('xpack.streams.editIlmPhasesFlyout.readOnlyLabel', {
            defaultMessage: 'Enable read-only access',
          })}
          data-test-subj={`${dataTestSubj}ReadOnlyCheckbox`}
          onChange={(e) => {
            field.onChange(e);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={i18n.translate('xpack.streams.editIlmPhasesFlyout.readOnlyHelp', {
            defaultMessage:
              'Enable to make the index read only. Disable to allow writing to the index.',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
