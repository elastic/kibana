/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiButtonGroup, htmlIdGenerator, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AxisExtentMode, YScaleType, XScaleType } from '@kbn/expression-xy-plugin/common';
import { RangeInputField } from '../../range_input_field';
import { validateExtent } from './helpers';
import type { UnifiedAxisExtentConfig } from './types';

export const LOG_LOWER_BOUND_MAX = 0.01;
export const LOWER_BOUND_MAX = 0;

const idPrefix = htmlIdGenerator()();

export interface DataBoundsObject {
  min: number;
  max: number;
}

export function AxisBoundsControl({
  type,
  canHaveNiceValues,
  ...props
}: {
  type: 'metric' | 'bucket';
  extent: UnifiedAxisExtentConfig;
  setExtent: (newExtent: UnifiedAxisExtentConfig | undefined) => void;
  dataBounds: DataBoundsObject | undefined;
  hasBarOrArea: boolean;
  disableCustomRange: boolean;
  testSubjPrefix: string;
  canHaveNiceValues?: boolean;
  scaleType?: YScaleType | XScaleType;
}) {
  const {
    extent,
    hasBarOrArea,
    setExtent,
    dataBounds,
    testSubjPrefix,
    scaleType,
    disableCustomRange,
  } = props;
  const { errorMsg, helpMsg } = validateExtent(hasBarOrArea, extent, scaleType);
  const allowedModeForNiceDomain =
    type === 'metric' ? ['full', 'custom'] : ['dataBounds', 'custom'];
  const canShowNiceValues = canHaveNiceValues && allowedModeForNiceDomain.includes(extent.mode);
  const canShowCustomRanges =
    extent?.mode === 'custom' && (type === 'bucket' || !disableCustomRange);

  const ModeAxisBoundsControl =
    type === 'metric' ? MetricAxisBoundsControl : BucketAxisBoundsControl;
  return (
    <ModeAxisBoundsControl
      {...props}
      scaleType={scaleType as YScaleType} // only applies to MetricAxisBoundsControl
    >
      {canShowCustomRanges ? (
        <RangeInputField
          isInvalid={Boolean(errorMsg)}
          label={' '}
          helpText={helpMsg}
          error={errorMsg}
          testSubjLayout={`${testSubjPrefix}_axisExtent_customBounds`}
          testSubjLower={`${testSubjPrefix}_axisExtent_lowerBound`}
          testSubjUpper={`${testSubjPrefix}_axisExtent_upperBound`}
          lowerValue={extent.lowerBound ?? ''}
          onLowerValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              lowerBound: isEmptyValue ? undefined : val,
            });
          }}
          onLowerValueBlur={() => {
            if (extent.lowerBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                lowerBound: getBounds('custom', scaleType, dataBounds).lowerBound,
              });
            }
          }}
          upperValue={extent.upperBound ?? ''}
          onUpperValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              upperBound: isEmptyValue ? undefined : val,
            });
          }}
          onUpperValueBlur={() => {
            if (extent.upperBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                upperBound: dataBounds.max,
              });
            }
          }}
        />
      ) : null}
      {canShowNiceValues ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.fullExtent.niceValues', {
            defaultMessage: 'Round to nice values',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiSwitch
            compressed
            showLabel={false}
            label={i18n.translate('xpack.lens.fullExtent.niceValues', {
              defaultMessage: 'Round to nice values',
            })}
            data-test-subj={`${testSubjPrefix}_axisExtent_niceValues`}
            checked={extent.niceValues == null || extent.niceValues}
            onChange={({ target: { checked: niceValues } }) => {
              setExtent({
                ...extent,
                niceValues,
              });
            }}
          />
        </EuiFormRow>
      ) : null}
    </ModeAxisBoundsControl>
  );
}

interface ModeAxisBoundsControlProps {
  extent: UnifiedAxisExtentConfig;
  setExtent: (newExtent: UnifiedAxisExtentConfig | undefined) => void;
  dataBounds: DataBoundsObject | undefined;
  hasBarOrArea: boolean;
  disableCustomRange: boolean;
  testSubjPrefix: string;
  children: React.ReactNode;
  scaleType?: YScaleType;
}

function MetricAxisBoundsControl({
  extent,
  setExtent,
  dataBounds,
  hasBarOrArea,
  disableCustomRange,
  testSubjPrefix,
  children,
  scaleType,
}: ModeAxisBoundsControlProps) {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.axisExtent.label', {
          defaultMessage: 'Bounds',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.axisExtent.label', {
            defaultMessage: 'Bounds',
          })}
          data-test-subj={`${testSubjPrefix}_axisBounds_groups`}
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}full`,
              label: i18n.translate('xpack.lens.axisExtent.full', {
                defaultMessage: 'Full',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_full`,
            },
            {
              id: `${idPrefix}dataBounds`,
              label: i18n.translate('xpack.lens.axisExtent.axisExtent.dataBounds', {
                defaultMessage: 'Data',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_data`,
              isDisabled: hasBarOrArea,
              toolTipContent: hasBarOrArea
                ? i18n.translate('xpack.lens.axisExtent.disabledDataBoundsMessage', {
                    defaultMessage: 'Only line charts can be fit to the data bounds',
                  })
                : undefined,
            },
            {
              id: `${idPrefix}custom`,
              label: i18n.translate('xpack.lens.axisExtent.axisExtent.custom', {
                defaultMessage: 'Custom',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_custom`,
              isDisabled: disableCustomRange,
            },
          ]}
          idSelected={`${idPrefix}${
            (hasBarOrArea && extent.mode === 'dataBounds') || disableCustomRange
              ? 'full'
              : extent.mode
          }`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as UnifiedAxisExtentConfig['mode'];
            setExtent({
              ...extent,
              mode: newMode,
              ...getBounds(newMode, scaleType, dataBounds),
            });
          }}
        />
      </EuiFormRow>
      {children}
    </>
  );
}

export function getBounds(
  mode: AxisExtentMode,
  scaleType?: YScaleType | XScaleType,
  dataBounds?: DataBoundsObject
): Pick<UnifiedAxisExtentConfig, 'lowerBound' | 'upperBound'> {
  if (mode !== 'custom' || !dataBounds)
    return {
      lowerBound: undefined,
      upperBound: undefined,
    };

  if (dataBounds.min >= 0 && dataBounds.max >= 0) {
    const lowerBoundMax = scaleType === 'log' ? LOG_LOWER_BOUND_MAX : LOWER_BOUND_MAX;
    return {
      upperBound: dataBounds.max,
      lowerBound: Math.max(Math.min(lowerBoundMax, dataBounds.min), lowerBoundMax),
    };
  }

  if (dataBounds.min <= 0 && dataBounds.max <= 0) {
    const upperBoundMin = scaleType === 'log' ? -LOG_LOWER_BOUND_MAX : LOWER_BOUND_MAX;
    return {
      upperBound: Math.min(Math.max(upperBoundMin, dataBounds.max), upperBoundMin),
      lowerBound: dataBounds.min,
    };
  }

  if (scaleType === 'log') {
    if (Math.abs(dataBounds.min) > Math.abs(dataBounds.max)) {
      return {
        upperBound: -LOG_LOWER_BOUND_MAX,
        lowerBound: dataBounds.min,
      };
    }

    return {
      upperBound: dataBounds.max,
      lowerBound: LOG_LOWER_BOUND_MAX,
    };
  }

  return {
    upperBound: dataBounds.max,
    lowerBound: dataBounds.min,
  };
}

function BucketAxisBoundsControl({
  extent,
  setExtent,
  dataBounds,
  testSubjPrefix,
  children,
}: Omit<ModeAxisBoundsControlProps, 'scaleType'>) {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.axisExtent.label', {
          defaultMessage: 'Bounds',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.axisExtent.label', {
            defaultMessage: 'Bounds',
          })}
          data-test-subj={`${testSubjPrefix}_axisBounds_groups`}
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}dataBounds`,
              label: i18n.translate('xpack.lens.axisExtent.dataBounds', {
                defaultMessage: 'Data',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_data`,
            },
            {
              id: `${idPrefix}custom`,
              label: i18n.translate('xpack.lens.axisExtent.custom', {
                defaultMessage: 'Custom',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_custom`,
            },
          ]}
          idSelected={`${idPrefix}${extent.mode ?? 'dataBounds'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as UnifiedAxisExtentConfig['mode'];
            setExtent({
              ...extent,
              mode: newMode,
              lowerBound: newMode === 'custom' && dataBounds ? dataBounds.min : undefined,
              upperBound: newMode === 'custom' && dataBounds ? dataBounds.max : undefined,
            });
          }}
        />
      </EuiFormRow>
      {children}
    </>
  );
}
