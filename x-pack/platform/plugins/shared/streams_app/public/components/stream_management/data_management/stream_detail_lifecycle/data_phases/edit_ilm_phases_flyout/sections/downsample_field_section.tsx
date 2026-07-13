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
  EuiText,
  EuiTitle,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import type { DownsamplePhase, IlmPhasesFlyoutFormInternal } from '../form';
import { DOWNSAMPLE_PHASES } from '../form';
import { DownsampleIntervalField } from '../form';
import {
  downsamplingHelpText,
  getDoubledDurationFromPrevious,
  type PreservedTimeUnit,
} from '../../shared';
import { TIME_UNIT_OPTIONS } from '../constants';

export interface DownsampleFieldSectionProps {
  phaseName: DownsamplePhase;
  dataTestSubj: string;
  isMetricsStream: boolean;
}

export const DownsampleFieldSection = ({
  phaseName,
  dataTestSubj,
  isMetricsStream,
}: DownsampleFieldSectionProps) => {
  const { control, getFieldState, getValues, setValue, trigger, formState } =
    useFormContext<IlmPhasesFlyoutFormInternal>();

  const enabledPath =
    `_meta.${phaseName}.downsampleEnabled` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const intervalValuePath =
    `_meta.${phaseName}.downsample.fixedIntervalValue` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const intervalUnitPath =
    `_meta.${phaseName}.downsample.fixedIntervalUnit` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;

  const titleId = useGeneratedHtmlId({ prefix: dataTestSubj });
  const checkboxId = useGeneratedHtmlId({
    prefix: `${dataTestSubj}DownsamplingCheckbox-${phaseName}`,
  });

  const isEnabled = Boolean(useWatch({ control, name: enabledPath }));

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
          <EuiCheckbox
            id={checkboxId}
            aria-labelledby={titleId}
            checked={isEnabled}
            data-test-subj={`${dataTestSubj}DownsamplingSwitch`}
            onChange={(e) => {
              const nextEnabled = e.target.checked;
              setValue(enabledPath, nextEnabled);

              // When enabling downsampling, default the fixed_interval to 2x the previous enabled downsample interval.
              // Only do this when the current interval is still the schema default (pristine 1d) to avoid clobbering
              // existing values when toggling.
              const currentValue = String(getValues(intervalValuePath) ?? '').trim();
              const currentUnit = String(getValues(intervalUnitPath) ?? 'd') as PreservedTimeUnit;

              const isStillDefault =
                currentValue === '1' &&
                currentUnit === 'd' &&
                getFieldState(intervalValuePath, formState).isDirty === false &&
                getFieldState(intervalUnitPath, formState).isDirty === false;

              if (nextEnabled && isStillDefault) {
                const phaseIndex = DOWNSAMPLE_PHASES.indexOf(phaseName);
                const previousPhases =
                  phaseIndex > 0 ? DOWNSAMPLE_PHASES.slice(0, phaseIndex).reverse() : [];

                for (const previousPhase of previousPhases) {
                  const isPrevEnabled = Boolean(getValues(`_meta.${previousPhase}.enabled`));
                  const isPrevDownsampleEnabled = Boolean(
                    getValues(`_meta.${previousPhase}.downsampleEnabled`)
                  );
                  if (!isPrevEnabled || !isPrevDownsampleEnabled) continue;

                  const previousValue = String(
                    getValues(`_meta.${previousPhase}.downsample.fixedIntervalValue`) ?? ''
                  ).trim();
                  if (previousValue === '') continue;

                  const previousUnit = String(
                    getValues(`_meta.${previousPhase}.downsample.fixedIntervalUnit`) ?? 'd'
                  ) as PreservedTimeUnit;

                  const previousNum = Number(previousValue);
                  if (!Number.isFinite(previousNum) || previousNum <= 0) continue;

                  const { value, unit } = getDoubledDurationFromPrevious({
                    previousValue,
                    previousUnit,
                    previousValueFallback: previousNum,
                    previousValueMinExclusive: 0,
                  });
                  setValue(intervalValuePath, value);
                  setValue(intervalUnitPath, unit);
                  break;
                }
              }

              // Validate (or clear) dependent intervals when toggling.
              setTimeout(() => {
                void trigger();
              }, 0);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isMetricsStream && isEnabled && (
        <EuiCallOut
          announceOnMount
          size="s"
          data-test-subj={`${dataTestSubj}DownsamplingNotSupportedCallout-${phaseName}`}
          title={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingNotSupportedTitle', {
            defaultMessage: 'Downsampling requires a time series stream',
          })}
        >
          <EuiText size="s">
            {i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingNotSupportedBody', {
              defaultMessage:
                'As this stream is not a time series, downsampling steps from this ILM policy will be excluded.',
            })}
          </EuiText>
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
