/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSwitch,
  EuiTitle,
  EuiCallOut,
  useGeneratedHtmlId,
  EuiLink,
} from '@elastic/eui';
import type { DownsamplePhase, IlmPhasesFlyoutFormInternal } from '../form';
import { DOWNSAMPLE_PHASES } from '../form';
import { DownsampleIntervalField } from '../form';
import {
  downsamplingHelpText,
  getDoubledDurationFromPrevious,
  type PreservedTimeUnit,
} from '../../shared';
import { TIME_UNIT_OPTIONS } from '../constants';
import { useKibana } from '../../../../../../hooks/use_kibana';

export interface DownsampleFieldSectionProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: DownsamplePhase;
  dataTestSubj: string;
  isMetricsStream: boolean;
}

export const DownsampleFieldSection = ({
  form,
  phaseName,
  dataTestSubj,
  isMetricsStream,
}: DownsampleFieldSectionProps) => {
  const enabledPath = `_meta.${phaseName}.downsampleEnabled`;
  const intervalValuePath = `_meta.${phaseName}.downsample.fixedIntervalValue`;
  const intervalUnitPath = `_meta.${phaseName}.downsample.fixedIntervalUnit`;
  const readonlyPath = `_meta.${phaseName}.readonlyEnabled`;

  const titleId = useGeneratedHtmlId({ prefix: dataTestSubj });

  useFormData({ form, watch: enabledPath });

  const enabledField = form.getFields()[enabledPath];
  const isEnabled = Boolean(enabledField?.value);
  const readonlyDefaultValue = form.getFieldDefaultValue<boolean>(readonlyPath);
  const readonlyField = form.getFields()[readonlyPath];
  const isReadonlyEnabled = Boolean(readonlyField?.value ?? readonlyDefaultValue);

  const resetReadonly = useCallback(() => {
    // Ensure the "default value on the form" is reset too so that when the readonly field is re-mounted
    // (after toggling downsampling off), it comes back unchecked.
    const payload: Record<string, unknown> = { _meta: { [phaseName]: { readonlyEnabled: false } } };
    form.updateFieldValues(payload, { runDeserializer: false });
    form.setFieldValue(readonlyPath, false);
  }, [form, phaseName, readonlyPath]);

  useEffect(() => {
    if (isEnabled && isReadonlyEnabled) {
      resetReadonly();
    }
  }, [isEnabled, isReadonlyEnabled, resetReadonly]);

  const {
    core: { docLinks },
  } = useKibana();

  if (!enabledField) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3 id={titleId}>
                  {i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingTitle', {
                    defaultMessage: 'Downsampling',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={downsamplingHelpText} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSwitch
            label=""
            showLabel={false}
            aria-labelledby={titleId}
            compressed
            checked={isEnabled}
            data-test-subj={`${dataTestSubj}DownsamplingSwitch`}
            onChange={(e) => {
              const nextEnabled = e.target.checked;
              enabledField.setValue(nextEnabled);

              if (nextEnabled) {
                // Downsampling is incompatible with the ILM "readonly" action in this flyout.
                // Clear and unmount the readonly toggle while downsampling is enabled.
                resetReadonly();
              }

              // When enabling downsampling, default the fixed_interval to 2x the previous enabled downsample interval.
              // Only do this when the current interval is still the schema default (pristine 1d) to avoid clobbering
              // existing values when toggling.
              if (!nextEnabled) return;

              const fields = form.getFields();
              const valueField = fields[intervalValuePath];
              const unitField = fields[intervalUnitPath];
              if (!valueField || !unitField) return;

              const currentValue = String(valueField.value ?? '').trim();
              const currentUnit = String(unitField.value ?? 'd') as PreservedTimeUnit;

              const isStillDefault =
                currentValue === '1' &&
                currentUnit === 'd' &&
                valueField.isModified === false &&
                unitField.isModified === false;
              if (!isStillDefault) return;

              const phaseIndex = DOWNSAMPLE_PHASES.indexOf(phaseName);
              const previousPhases =
                phaseIndex > 0 ? DOWNSAMPLE_PHASES.slice(0, phaseIndex).reverse() : [];

              for (const previousPhase of previousPhases) {
                const isPrevEnabled = Boolean(fields[`_meta.${previousPhase}.enabled`]?.value);
                const isPrevDownsampleEnabled = Boolean(
                  fields[`_meta.${previousPhase}.downsampleEnabled`]?.value
                );
                if (!isPrevEnabled || !isPrevDownsampleEnabled) continue;

                const previousValue = String(
                  fields[`_meta.${previousPhase}.downsample.fixedIntervalValue`]?.value ?? ''
                ).trim();
                if (previousValue === '') continue;

                const previousUnit = String(
                  fields[`_meta.${previousPhase}.downsample.fixedIntervalUnit`]?.value ?? 'd'
                ) as PreservedTimeUnit;

                const previousNum = Number(previousValue);
                if (!Number.isFinite(previousNum) || previousNum <= 0) continue;

                const { value, unit } = getDoubledDurationFromPrevious({
                  previousValue,
                  previousUnit,
                  previousValueFallback: previousNum,
                  previousValueMinExclusive: 0,
                });
                valueField.setValue(value);
                unitField.setValue(unit);
                break;
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isMetricsStream && isEnabled && (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType="info"
          data-test-subj={`${dataTestSubj}DownsamplingNotSupportedCallout-${phaseName}`}
          title={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingNotSupportedTitle', {
            defaultMessage: 'Downsampling is unavailable for this stream',
          })}
        >
          <FormattedMessage
            id="xpack.streams.editIlmPhasesFlyout.downsamplingNotSupportedBody"
            defaultMessage="Downsampling only works for time series streams. Configuring these settings won't effect how this stream's data is stored. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={docLinks?.links?.observability?.downsamplingConcepts}
                  target="_blank"
                >
                  {i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingLearnMoreLink', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      )}

      <div hidden={!isEnabled} aria-hidden={!isEnabled}>
        <DownsampleIntervalField
          phaseName={phaseName}
          dataTestSubj={dataTestSubj}
          timeUnitOptions={TIME_UNIT_OPTIONS}
          isEnabled={isEnabled}
        />
      </div>
    </EuiFlexGroup>
  );
};
