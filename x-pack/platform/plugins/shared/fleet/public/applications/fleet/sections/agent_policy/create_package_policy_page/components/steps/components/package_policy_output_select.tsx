/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';

import type { Output } from '../../../../../../types';

export interface PackagePolicyOutputSelectProps {
  /** The package policy's `output_id`. Unset means the output of the parent agent policy. */
  outputId?: string | null;
  /** Receives the chosen output id, or null for the output inherited from the agent policy. */
  onChange: (outputId: string | null) => void;
  /** Outputs the package policy may use, as returned by `useOutputs`. */
  allowedOutputs: Array<Pick<Output, 'id' | 'name'>>;
  /** Name of the inherited output, as returned by `useOutputs`. */
  inheritedOutputName?: string;
  isLoading?: boolean;
  /** Disabled because a parent agent policy is managed. */
  isDisabled?: boolean;
  fullWidth?: boolean;
  compressed?: boolean;
  /** Show the help text in an info icon tooltip next to the label instead of under the field. */
  helpTextAsTooltip?: boolean;
  'data-test-subj'?: string;
}

/**
 * The output of a package policy: the one inherited from its agent policy, or one of the outputs it
 * is allowed to use. Callers render it only where `useOutputs` reports `canUseOutputPerIntegration`.
 */
export function PackagePolicyOutputSelect({
  outputId,
  onChange,
  allowedOutputs,
  inheritedOutputName,
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  compressed = false,
  helpTextAsTooltip = false,
  'data-test-subj': dataTestSubj = 'packagePolicyOutputInput',
}: PackagePolicyOutputSelectProps) {
  // An unset output_id means "use the output of the parent agent policy". EuiSelect cannot
  // hold null, so that state is represented by an empty value — label it explicitly, since
  // an unlabelled option reads as "no output configured".
  const inheritedOutputText = useMemo(
    () =>
      inheritedOutputName
        ? i18n.translate(
            'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputInheritedWithNameOption',
            {
              defaultMessage: 'Inherited from agent policy (currently {outputName})',
              values: { outputName: inheritedOutputName },
            }
          )
        : i18n.translate(
            'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputInheritedOption',
            { defaultMessage: 'Inherited from agent policy' }
          ),
    [inheritedOutputName]
  );

  const helpText = (
    <FormattedMessage
      id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputHelpLabel"
      defaultMessage="Change the default output inherited from the parent agent policy. This setting changes where the integration's data is sent."
    />
  );

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      display={compressed ? 'rowCompressed' : 'row'}
      label={
        <>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputInputLabel"
            defaultMessage="Output"
          />
          {helpTextAsTooltip && (
            <>
              {' '}
              <EuiIconTip
                type="info"
                color="subdued"
                content={helpText}
                anchorProps={{ 'data-test-subj': `${dataTestSubj}-helpTooltip` }}
              />
            </>
          )}
          {isDisabled && (
            <>
              {' '}
              <EuiIconTip
                type="question"
                color="subdued"
                content={
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputDisabledTooltip"
                    defaultMessage="Output cannot be modified because this integration is used by a managed agent policy."
                  />
                }
              />
            </>
          )}
        </>
      }
      helpText={helpTextAsTooltip ? undefined : helpText}
    >
      <EuiSelect
        fullWidth={fullWidth}
        compressed={compressed}
        disabled={isDisabled}
        data-test-subj={dataTestSubj}
        isLoading={isLoading}
        options={[
          {
            value: '',
            text: inheritedOutputText,
          },
          ...allowedOutputs.map((output) => ({
            value: output.id,
            text: output.name,
          })),
        ]}
        value={outputId || ''}
        onChange={(e) => onChange(e.target.value.trim() || null)}
      />
    </EuiFormRow>
  );
}
