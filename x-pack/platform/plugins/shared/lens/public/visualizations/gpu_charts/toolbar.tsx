/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiPopover,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiSwitch,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { LodTier } from './types';
import { LOD_THRESHOLDS } from './constants';

export interface ToolbarState {
  lodTier: LodTier;
  autoLod: boolean;
  pointSize: number;
  pointOpacity: number;
  hexagonRadius: number;
  hexagonElevationScale: number;
  showAxes: boolean;
  enableRotation: boolean;
}

interface GpuChartsToolbarProps {
  state: ToolbarState;
  onChange: (state: Partial<ToolbarState>) => void;
  onResetCamera?: () => void;
  chartType: 'scatter3d' | 'hexagon';
  dataPointCount: number;
}

export function GpuChartsToolbar({
  state,
  onChange,
  onResetCamera,
  chartType,
  dataPointCount,
}: GpuChartsToolbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const handleLodChange = useCallback(
    (tier: LodTier) => {
      onChange({ lodTier: tier, autoLod: false });
    },
    [onChange]
  );

  const handleAutoLodToggle = useCallback(
    (enabled: boolean) => {
      onChange({ autoLod: enabled });
    },
    [onChange]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {/* Camera reset button */}
      {chartType === 'scatter3d' && onResetCamera && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.lens.gpuCharts.resetCamera', {
              defaultMessage: 'Reset camera',
            })}
          >
            <EuiButtonIcon
              iconType="refresh"
              aria-label={i18n.translate('xpack.lens.gpuCharts.resetCameraAriaLabel', {
                defaultMessage: 'Reset camera to default position',
              })}
              onClick={onResetCamera}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      {/* LOD indicator */}
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiToolTip
              content={i18n.translate('xpack.lens.gpuCharts.lodSettings', {
                defaultMessage: 'Level of Detail settings',
              })}
            >
              <EuiButtonIcon
                iconType="layers"
                aria-label={i18n.translate('xpack.lens.gpuCharts.lodSettingsAriaLabel', {
                  defaultMessage: 'Open Level of Detail settings',
                })}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                size="s"
                color={state.autoLod ? 'primary' : 'text'}
              />
            </EuiToolTip>
          }
          isOpen={isSettingsOpen}
          closePopover={() => setIsSettingsOpen(false)}
          anchorPosition="downRight"
        >
          <EuiPanel paddingSize="s" style={{ width: 280 }}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.lens.gpuCharts.lodTitle', {
                  defaultMessage: 'Level of Detail',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />

            <EuiFormRow>
              <EuiSwitch
                label={i18n.translate('xpack.lens.gpuCharts.autoLod', {
                  defaultMessage: 'Automatic LOD selection',
                })}
                checked={state.autoLod}
                onChange={(e) => handleAutoLodToggle(e.target.checked)}
                compressed
              />
            </EuiFormRow>

            {!state.autoLod && (
              <>
                <EuiSpacer size="s" />
                <EuiFormRow
                  label={i18n.translate('xpack.lens.gpuCharts.lodTier', {
                    defaultMessage: 'LOD Tier',
                  })}
                  helpText={getLodTierDescription(state.lodTier, dataPointCount)}
                >
                  <EuiRange
                    min={1}
                    max={4}
                    step={1}
                    value={state.lodTier}
                    onChange={(e) => handleLodChange(Number(e.currentTarget.value) as LodTier)}
                    showTicks
                    tickInterval={1}
                    compressed
                  />
                </EuiFormRow>
              </>
            )}
          </EuiPanel>
        </EuiPopover>
      </EuiFlexItem>

      {/* Visual settings */}
      <EuiFlexItem grow={false}>
        <VisualSettingsPopover state={state} onChange={onChange} chartType={chartType} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface VisualSettingsPopoverProps {
  state: ToolbarState;
  onChange: (state: Partial<ToolbarState>) => void;
  chartType: 'scatter3d' | 'hexagon';
}

function VisualSettingsPopover({ state, onChange, chartType }: VisualSettingsPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <EuiPopover
      button={
        <EuiToolTip
          content={i18n.translate('xpack.lens.gpuCharts.visualSettings', {
            defaultMessage: 'Visual settings',
          })}
        >
          <EuiButtonIcon
            iconType="controlsHorizontal"
            aria-label={i18n.translate('xpack.lens.gpuCharts.visualSettingsAriaLabel', {
              defaultMessage: 'Open visual settings',
            })}
            onClick={() => setIsOpen(!isOpen)}
            size="s"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
    >
      <EuiPanel paddingSize="s" style={{ width: 280 }}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.lens.gpuCharts.visualSettingsTitle', {
              defaultMessage: 'Visual Settings',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="s" />

        {chartType === 'scatter3d' ? (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.lens.gpuCharts.pointSize', {
                defaultMessage: 'Point size',
              })}
            >
              <EuiRange
                min={1}
                max={20}
                step={1}
                value={state.pointSize}
                onChange={(e) => onChange({ pointSize: Number(e.currentTarget.value) })}
                showValue
                compressed
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.lens.gpuCharts.pointOpacity', {
                defaultMessage: 'Point opacity',
              })}
            >
              <EuiRange
                min={0.1}
                max={1}
                step={0.1}
                value={state.pointOpacity}
                onChange={(e) => onChange({ pointOpacity: Number(e.currentTarget.value) })}
                showValue
                compressed
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiSwitch
                label={i18n.translate('xpack.lens.gpuCharts.enableRotation', {
                  defaultMessage: 'Enable rotation',
                })}
                checked={state.enableRotation}
                onChange={(e) => onChange({ enableRotation: e.target.checked })}
                compressed
              />
            </EuiFormRow>
          </>
        ) : (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.lens.gpuCharts.hexagonRadius', {
                defaultMessage: 'Hexagon radius',
              })}
            >
              <EuiRange
                min={100}
                max={10000}
                step={100}
                value={state.hexagonRadius}
                onChange={(e) => onChange({ hexagonRadius: Number(e.currentTarget.value) })}
                showValue
                compressed
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.lens.gpuCharts.elevationScale', {
                defaultMessage: 'Elevation scale',
              })}
            >
              <EuiRange
                min={0}
                max={10}
                step={0.5}
                value={state.hexagonElevationScale}
                onChange={(e) => onChange({ hexagonElevationScale: Number(e.currentTarget.value) })}
                showValue
                compressed
              />
            </EuiFormRow>
          </>
        )}

        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('xpack.lens.gpuCharts.showAxes', {
              defaultMessage: 'Show axes',
            })}
            checked={state.showAxes}
            onChange={(e) => onChange({ showAxes: e.target.checked })}
            compressed
          />
        </EuiFormRow>
      </EuiPanel>
    </EuiPopover>
  );
}

function getLodTierDescription(tier: LodTier, dataPointCount: number): string {
  switch (tier) {
    case 1:
      return i18n.translate('xpack.lens.gpuCharts.lodTier1Description', {
        defaultMessage: 'Full resolution (up to {max} points)',
        values: { max: LOD_THRESHOLDS.TIER_1_MAX.toLocaleString() },
      });
    case 2:
      return i18n.translate('xpack.lens.gpuCharts.lodTier2Description', {
        defaultMessage: 'Client-side sampling ({max} point limit)',
        values: { max: LOD_THRESHOLDS.TIER_2_MAX.toLocaleString() },
      });
    case 3:
      return i18n.translate('xpack.lens.gpuCharts.lodTier3Description', {
        defaultMessage: 'Server-side sampling ({max} point limit)',
        values: { max: LOD_THRESHOLDS.TIER_3_MAX.toLocaleString() },
      });
    case 4:
      return i18n.translate('xpack.lens.gpuCharts.lodTier4Description', {
        defaultMessage: 'Tile-based progressive loading',
      });
    default:
      return '';
  }
}
