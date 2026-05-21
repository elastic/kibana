/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useController, useFormContext, type FieldPath } from 'react-hook-form';
import type { IlmPhasesFlyoutFormInternal, ReadonlyAllowedPhase } from '../types';

export interface ReadOnlyToggleFieldProps {
  phaseName: ReadonlyAllowedPhase;
  dataTestSubj: string;
}

export const ReadOnlyToggleField = ({ phaseName, dataTestSubj }: ReadOnlyToggleFieldProps) => {
  const checkboxId = useGeneratedHtmlId({
    prefix: `${dataTestSubj}ReadOnlyCheckbox-${phaseName}`,
  });

  return (
    <ReadOnlyToggleControl
      checkboxId={checkboxId}
      path={`_meta.${phaseName}.readonlyEnabled`}
      dataTestSubj={dataTestSubj}
    />
  );
};

const ReadOnlyToggleControl = ({
  checkboxId,
  path,
  dataTestSubj,
}: {
  checkboxId: string;
  path: FieldPath<IlmPhasesFlyoutFormInternal>;
  dataTestSubj: string;
}) => {
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();
  const { field } = useController({ control, name: path });
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
            field.onChange(e.target.checked);
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
