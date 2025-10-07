/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { IconType } from '@elastic/eui';
import { EuiButtonGroup, EuiComboBox, EuiFormRow, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GaugeShape } from '@kbn/expression-gauge-plugin/common';
import { GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import {
  IconChartGaugeArcSimple,
  IconChartGaugeCircleSimple,
  IconChartGaugeSemiCircleSimple,
  IconChartLinearSimple,
} from '@kbn/chart-icons';
import type { GaugeVisualizationState } from '../constants';
import { gaugeTitlesByType } from '../constants';

const PREFIX = `lns_gaugeOrientation_`;
export const bulletTypes = [
  {
    id: `${PREFIX}horizontalBullet`,
    label: i18n.translate('xpack.lens.gauge.bullet.orientantionHorizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
  {
    id: `${PREFIX}verticalBullet`,
    label: i18n.translate('xpack.lens.gauge.bullet.orientantionVertical', {
      defaultMessage: 'Vertical',
    }),
  },
];

const CHART_NAMES: Record<GaugeShape, { id: string; icon: IconType; label: string }> = {
  horizontalBullet: {
    id: GaugeShapes.HORIZONTAL_BULLET,
    icon: IconChartLinearSimple,
    label: i18n.translate('xpack.lens.gaugeLinear.gaugeLabel', {
      defaultMessage: 'Linear',
    }),
  },
  verticalBullet: {
    id: GaugeShapes.VERTICAL_BULLET,
    icon: IconChartLinearSimple,
    label: i18n.translate('xpack.lens.gaugeLinear.gaugeLabel', {
      defaultMessage: 'Linear',
    }),
  },
  semiCircle: {
    id: GaugeShapes.SEMI_CIRCLE,
    icon: IconChartGaugeSemiCircleSimple,
    label: gaugeTitlesByType.semiCircle,
  },
  arc: {
    id: GaugeShapes.ARC,
    icon: IconChartGaugeArcSimple,
    label: gaugeTitlesByType.arc,
  },
  circle: {
    id: GaugeShapes.CIRCLE,
    icon: IconChartGaugeCircleSimple,
    label: gaugeTitlesByType.circle,
  },
};

const gaugeShapes = [
  CHART_NAMES.horizontalBullet,
  CHART_NAMES.semiCircle,
  CHART_NAMES.arc,
  CHART_NAMES.circle,
];

export function AppearanceSettings({
  state,
  setState,
}: {
  state: GaugeVisualizationState;
  setState: (newState: GaugeVisualizationState) => void;
}) {
  const selectedOption = CHART_NAMES[state.shape];
  const selectedBulletType = bulletTypes.find(({ id }) => id === `${PREFIX}${state.shape}`);

  return (
    <>
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.gauge.angleType', {
          defaultMessage: 'Gauge shape',
        })}
      >
        <EuiComboBox
          fullWidth
          compressed
          data-test-subj="lnsToolbarGaugeAngleType"
          aria-label={i18n.translate('xpack.lens.label.gauge.angleType', {
            defaultMessage: 'Gauge shape',
          })}
          onChange={([option]) => {
            setState({ ...state, shape: option.value as GaugeShape });
          }}
          isClearable={false}
          options={gaugeShapes.map(({ id, label, icon }) => ({
            value: id,
            label,
            prepend: <EuiIcon type={icon} />,
          }))}
          selectedOptions={[selectedOption]}
          singleSelection={{ asPlainText: true }}
          prepend={<EuiIcon type={selectedOption.icon} />}
        />
      </EuiFormRow>
      {(state.shape === GaugeShapes.HORIZONTAL_BULLET ||
        state.shape === GaugeShapes.VERTICAL_BULLET) &&
        selectedBulletType && (
          <EuiFormRow fullWidth display="columnCompressed" label=" ">
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.gauge.bulletType', {
                defaultMessage: 'Bullet type',
              })}
              data-test-subj="lens-gauge-bullet-type"
              buttonSize="compressed"
              options={bulletTypes}
              idSelected={selectedBulletType.id}
              onChange={(optionId) => {
                const newBulletTypeWithPrefix = bulletTypes.find(({ id }) => id === optionId)!.id;
                const newBulletType = newBulletTypeWithPrefix.replace(PREFIX, '');
                setState({ ...state, shape: newBulletType as GaugeShape });
              }}
            />
          </EuiFormRow>
        )}
    </>
  );
}
