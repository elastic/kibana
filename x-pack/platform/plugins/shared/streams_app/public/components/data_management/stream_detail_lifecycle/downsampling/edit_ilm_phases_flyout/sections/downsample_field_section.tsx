/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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
} from '@elastic/eui';
import type { DownsamplePhase, IlmPhasesFlyoutFormInternal } from '../form';
import { DownsampleIntervalField } from '../form';
import { TIME_UNIT_OPTIONS } from '../constants';

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

  const titleId = useGeneratedHtmlId({ prefix: dataTestSubj });

  useFormData({ form, watch: enabledPath });

  const enabledField = form.getFields()[enabledPath];
  if (!enabledField) return null;
  const isEnabled = Boolean(enabledField.value);

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
              <EuiIconTip
                content={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingHelp', {
                  defaultMessage: 'Configure downsampling for this phase.',
                })}
              />
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
            onChange={(e) => enabledField.setValue(e.target.checked)}
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
          {i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingNotSupportedBody', {
            defaultMessage:
              "Downsampling only works for time series streams. Configuring these settings won't effect how this stream's data is stored.",
          })}
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
