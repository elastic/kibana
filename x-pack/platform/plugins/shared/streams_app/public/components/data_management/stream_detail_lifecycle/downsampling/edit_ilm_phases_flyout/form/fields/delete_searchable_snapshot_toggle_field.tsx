/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../types';

export interface DeleteSearchableSnapshotToggleFieldProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: PhaseName | undefined;
  dataTestSubj: string;
}

export const DeleteSearchableSnapshotToggleField = ({
  form,
  phaseName,
  dataTestSubj,
}: DeleteSearchableSnapshotToggleFieldProps) => {
  const path = `_meta.delete.deleteSearchableSnapshotEnabled`;
  useFormData({ form, watch: path });

  if (phaseName !== 'delete') return null;

  const field = form.getFields()[path];
  if (!field) return null;

  const deleteSearchableSnapshotValue = Boolean(field.value);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={`${dataTestSubj}DeleteSearchableSnapshotCheckbox`}
          checked={deleteSearchableSnapshotValue}
          label={i18n.translate('xpack.streams.editIlmPhasesFlyout.deleteSearchableSnapshotLabel', {
            defaultMessage: 'Delete searchable snapshot',
          })}
          data-test-subj={`${dataTestSubj}DeleteSearchableSnapshotCheckbox`}
          onChange={(e) => {
            field.onChange(e);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={i18n.translate(
            'xpack.streams.editIlmPhasesFlyout.deleteSearchableSnapshotHelp',
            {
              defaultMessage:
                'Enable to delete the searchable snapshot created in a previous phase.',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
