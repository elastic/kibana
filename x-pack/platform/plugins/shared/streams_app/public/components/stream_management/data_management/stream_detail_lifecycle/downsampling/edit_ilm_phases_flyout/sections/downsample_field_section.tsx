/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { useKibana } from '../../../../../../../hooks/use_kibana';

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
  const { control, getFieldState, getValues, resetField, setValue, trigger, formState } =
    useFormContext<IlmPhasesFlyoutFormInternal>();

  const enabledPath =
    `_meta.${phaseName}.downsampleEnabled` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const intervalValuePath =
    `_meta.${phaseName}.downsample.fixedIntervalValue` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const intervalUnitPath =
    `_meta.${phaseName}.downsample.fixedIntervalUnit` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const readonlyPath =
    `_meta.${phaseName}.readonlyEnabled` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;

  const titleId = useGeneratedHtmlId({ prefix: dataTestSubj });

  const isEnabled = Boolean(useWatch({ control, name: enabledPath }));
  const isReadonlyEnabled = Boolean(useWatch({ control, name: readonlyPath }));

  const resetReadonly = useCallback(() => {
    resetField(readonlyPath, { defaultValue: false });
    setValue(readonlyPath, false);
  }, [resetField, readonlyPath, setValue]);

  useEffect(() => {
    if (isEnabled && isReadonlyEnabled) {
      resetReadonly();
    }
  }, [isEnabled, isReadonlyEnabled, resetReadonly]);

  const {
    core: { docLinks },
  } = useKibana();

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
              setValue(enabledPath, nextEnabled);

              if (nextEnabled) {
                // Downsampling is incompatible with the ILM "readonly" action in this flyout.
                // Clear and unmount the readonly toggle while downsampling is enabled.
                resetReadonly();
              }

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
