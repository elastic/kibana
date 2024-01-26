/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { isEqual } from 'lodash';
import {
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiColorPicker,
  EuiFormRow,
  EuiPopover,
  useColorPickerState,
  EuiSwitch,
  EuiNotificationBadge,
  EuiCodeBlock,
  EuiIcon,
  EuiToolTip,
  EuiPopoverTitle,
} from '@elastic/eui';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

export type LensAttributesByType<VizType> = Extract<
  TypedLensByValueInput['attributes'],
  { visualizationType: VizType }
>;

function isXYChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsXY'> {
  return attributes.visualizationType === 'lnsXY';
}

function isPieChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsPie'> {
  return attributes.visualizationType === 'lnsPie';
}

function isHeatmapChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsHeatmap'> {
  return attributes.visualizationType === 'lnsHeatmap';
}

function isDatatable(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsDatatable'> {
  return attributes.visualizationType === 'lnsDatatable';
}

function isGaugeChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsGauge'> {
  return attributes.visualizationType === 'lnsGauge';
}

function isMetricChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<'lnsMetric'> {
  return attributes.visualizationType === 'lnsMetric';
}

function isSupportedChart(attributes: TypedLensByValueInput['attributes']) {
  return (
    isXYChart(attributes) ||
    isPieChart(attributes) ||
    isHeatmapChart(attributes) ||
    isGaugeChart(attributes) ||
    isMetricChart(attributes)
  );
}

function mergeOverrides(
  currentOverrides: AllOverrides | undefined,
  newOverrides: AllOverrides | undefined,
  defaultOverrides: AllOverrides
): AllOverrides | undefined {
  if (currentOverrides == null || isEqual(currentOverrides, defaultOverrides)) {
    return newOverrides;
  }
  if (newOverrides == null) {
    return Object.fromEntries(
      Object.entries(currentOverrides)
        .map(([key, value]) => {
          if (!(key in defaultOverrides)) {
            return [key, value];
          }
          // @ts-expect-error
          if (isEqual(currentOverrides[key], defaultOverrides[key])) {
            return [];
          }
          const newObject: Partial<AllOverrides[keyof AllOverrides]> = {};
          // @ts-expect-error
          for (const [innerKey, innerValue] of Object.entries(currentOverrides[key])) {
            // @ts-expect-error
            if (!(innerKey in defaultOverrides[key])) {
              // @ts-expect-error
              newObject[innerKey] = innerValue;
            }
          }
          return [key, newObject];
        })
        .filter((arr) => arr.length)
    );
  }
  return {
    ...currentOverrides,
    ...newOverrides,
  };
}

export function OverrideSwitch({
  rowLabel,
  controlLabel,
  value,
  override,
  setOverrideValue,
  helpText,
}: {
  rowLabel: string;
  controlLabel: string;
  helpText?: string;
  value: AllOverrides | undefined;
  override: AllOverrides;
  setOverrideValue: (v: AllOverrides | undefined) => void;
}) {
  // check if value contains an object with the same structure as the default override
  const rootKey = Object.keys(override)[0] as keyof AllOverrides;
  const overridePath = [
    rootKey,
    Object.keys(override[rootKey] || {})[0] as keyof AllOverrides[keyof AllOverrides],
  ];
  const hasOverrideEnabled = Boolean(
    value && overridePath[0] in value && overridePath[1] in value[overridePath[0]]!
  );
  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={<CodeExample propName="overrides" code={JSON.stringify(override, null, 2)} />}
          position="right"
        >
          <span>
            {rowLabel} <EuiIcon type="questionInCircle" color="subdued" />
          </span>
        </EuiToolTip>
      }
      helpText={helpText}
      display="columnCompressedSwitch"
      hasChildLabel={false}
    >
      <EuiSwitch
        label={controlLabel}
        name="switch"
        checked={hasOverrideEnabled}
        onChange={() => {
          const finalOverrides = mergeOverrides(
            value,
            hasOverrideEnabled ? undefined : override,
            override
          );
          setOverrideValue(finalOverrides);
        }}
        compressed
      />
    </EuiFormRow>
  );
}

function CodeExample({ propName, code }: { propName: string; code: string }) {
  return (
    <EuiCodeBlock language="jsx" paddingSize="none">
      {`
  <LensEmbeddable ${propName}={${code}} />
        `}
    </EuiCodeBlock>
  );
}

export function AttributesMenu({
  currentAttributes,
  currentSO,
  saveValidSO,
}: {
  currentAttributes: TypedLensByValueInput['attributes'];
  currentSO: React.MutableRefObject<string>;
  saveValidSO: (attr: string) => void;
}) {
  const [attributesPopoverOpen, setAttributesPopoverOpen] = useState(false);
  const [color, setColor, errors] = useColorPickerState('#D6BF57');

  return (
    <EuiPopover
      button={
        <EuiButton
          data-test-subj="lns-example-change-attributes"
          onClick={() => setAttributesPopoverOpen(!attributesPopoverOpen)}
          iconType="arrowDown"
          iconSide="right"
          color="primary"
          isDisabled={!isSupportedChart(currentAttributes)}
        >
          Lens Attributes
        </EuiButton>
      }
      isOpen={attributesPopoverOpen}
      closePopover={() => setAttributesPopoverOpen(false)}
    >
      <div style={{ width: 300 }}>
        {isXYChart(currentAttributes) ? (
          <EuiFormRow label="Pick color" display="columnCompressed">
            <EuiColorPicker
              onChange={(newColor, output) => {
                setColor(newColor, output);
                // for sake of semplicity of this example change it locally and then shallow copy it
                const dataLayer = currentAttributes.state.visualization.layers[0];
                if ('yConfig' in dataLayer && dataLayer.yConfig) {
                  dataLayer.yConfig[0].color = newColor;
                  // this will make a string copy of it
                  const newAttributes = JSON.stringify(currentAttributes, null, 2);
                  currentSO.current = newAttributes;
                  saveValidSO(newAttributes);
                }
              }}
              color={color}
              isInvalid={!!errors}
            />
          </EuiFormRow>
        ) : null}
        {isMetricChart(currentAttributes) ? (
          <EuiFormRow label="Pick color" display="columnCompressed">
            <EuiColorPicker
              onChange={(newColor, output) => {
                setColor(newColor, output);
                // for sake of semplicity of this example change it locally and then shallow copy it
                currentAttributes.state.visualization.color = newColor;
                // this will make a string copy of it
                const newAttributes = JSON.stringify(currentAttributes, null, 2);
                currentSO.current = newAttributes;
                saveValidSO(newAttributes);
              }}
              color={color}
              isInvalid={!!errors}
            />
          </EuiFormRow>
        ) : null}
        {isPieChart(currentAttributes) ? (
          <EuiFormRow label="Show values" display="columnCompressedSwitch">
            <EuiSwitch
              label="As percentage"
              name="switch"
              checked={currentAttributes.state.visualization.layers[0].numberDisplay === 'percent'}
              onChange={() => {
                currentAttributes.state.visualization.layers[0].numberDisplay =
                  currentAttributes.state.visualization.layers[0].numberDisplay === 'percent'
                    ? 'value'
                    : 'percent';
                // this will make a string copy of it
                const newAttributes = JSON.stringify(currentAttributes, null, 2);
                currentSO.current = newAttributes;
                saveValidSO(newAttributes);
              }}
              compressed
            />
          </EuiFormRow>
        ) : null}
        {isHeatmapChart(currentAttributes) ? (
          <EuiFormRow label="Show values" display="columnCompressedSwitch">
            <EuiSwitch
              label="As percentage"
              name="switch"
              checked={Boolean(currentAttributes.state.visualization.percentageMode)}
              onChange={() => {
                currentAttributes.state.visualization.percentageMode =
                  !currentAttributes.state.visualization.percentageMode;
                // this will make a string copy of it
                const newAttributes = JSON.stringify(currentAttributes, null, 2);
                currentSO.current = newAttributes;
                saveValidSO(newAttributes);
              }}
              compressed
            />
          </EuiFormRow>
        ) : null}
        {isGaugeChart(currentAttributes) ? (
          <EuiFormRow label="Ticks visibility" display="columnCompressedSwitch">
            <EuiSwitch
              label="Show ticks"
              name="switch"
              checked={Boolean(currentAttributes.state.visualization.ticksPosition !== 'hidden')}
              onChange={() => {
                currentAttributes.state.visualization.ticksPosition =
                  currentAttributes.state.visualization.ticksPosition === 'hidden'
                    ? 'auto'
                    : 'hidden';
                // this will make a string copy of it
                const newAttributes = JSON.stringify(currentAttributes, null, 2);
                currentSO.current = newAttributes;
                saveValidSO(newAttributes);
              }}
              compressed
            />
          </EuiFormRow>
        ) : null}
      </div>
    </EuiPopover>
  );
}

type XYOverride = Record<'axisX' | 'axisLeft' | 'axisRight', { hide: boolean }>;
type PieOverride = Record<'partition', { fillOutside: boolean }>;
type GaugeOverride = Record<'gauge', { subtype: 'goal'; angleStart: number; angleEnd: number }>;
type SettingsOverride = Record<
  'settings',
  | { onBrushEnd: 'ignore' }
  | {
      theme: {
        heatmap: { xAxisLabel: { visible: boolean }; yAxisLabel: { visible: boolean } };
      };
    }
  | {
      theme: {
        metric: { border: string };
      };
    }
>;
type ChartOverride = Record<'chart', { title: string; description: string }>;

export type AllOverrides = Partial<
  XYOverride & PieOverride & SettingsOverride & GaugeOverride & ChartOverride
>;

export function OverridesMenu({
  currentAttributes,
  overrides,
  setOverrides,
}: {
  currentAttributes: TypedLensByValueInput['attributes'];
  overrides: AllOverrides | undefined;
  setOverrides: (overrides: AllOverrides | undefined) => void;
}) {
  const [overridesPopoverOpen, setOverridesPopoverOpen] = useState(false);
  const hasOverridesEnabled = Boolean(overrides) && !isDatatable(currentAttributes);
  return (
    <EuiPopover
      button={
        <EuiButton
          data-test-subj="lns-example-change-overrides"
          onClick={() => setOverridesPopoverOpen(!overridesPopoverOpen)}
          iconType="arrowDown"
          iconSide="right"
        >
          Overrides{' '}
          <EuiNotificationBadge color={hasOverridesEnabled ? 'accent' : 'subdued'}>
            {hasOverridesEnabled ? 'ON' : 'OFF'}
          </EuiNotificationBadge>
        </EuiButton>
      }
      isOpen={overridesPopoverOpen}
      closePopover={() => setOverridesPopoverOpen(false)}
    >
      <div style={{ width: 400 }}>
        <EuiPopoverTitle>Overrides</EuiPopoverTitle>
        <EuiText size="s">
          <p>
            Overrides are local to the Embeddable and forgotten when the visualization is open in
            the Editor. They should be used carefully for specific tweaks within the integration.
          </p>
          <p>
            There are mainly 2 use cases for overrides:
            <ul>
              <li>Specific styling/tuning feature missing in Lens</li>
              <li>Disable specific chart behaviour</li>
            </ul>
          </p>
          <p>Here&#39;s some examples:</p>
        </EuiText>
        <EuiSpacer />
        {isXYChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              settings: { onBrushEnd: 'ignore' },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Brush override"
            controlLabel="Disable brush action"
            helpText={`This override disables the brushing locally, via the special "ignore" value.`}
          />
        ) : null}
        {isHeatmapChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              settings: {
                theme: {
                  heatmap: { xAxisLabel: { visible: false }, yAxisLabel: { visible: false } },
                },
              },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Axis override"
            controlLabel="Hide all axes"
            helpText={`Heatmap axis override is set via the settings component.`}
          />
        ) : null}
        {isPieChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              partition: { fillOutside: true },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Partition override"
            controlLabel="Label outsides"
          />
        ) : null}
        {isXYChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              axisX: { hide: true },
              axisLeft: { hide: true },
              axisRight: { hide: true },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Axis override"
            controlLabel="Hide all axes"
          />
        ) : null}
        {isGaugeChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              gauge: {
                subtype: 'goal',
                angleStart: Math.PI + (Math.PI - (2 * Math.PI) / 2.5) / 2,
                angleEnd: -(Math.PI - (2 * Math.PI) / 2.5) / 2,
              },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Shape override"
            controlLabel="Enable Arc shape"
            helpText="Note that this is used only for example purposes, the arc configuration has some conflicts with some Lens attributes."
          />
        ) : null}
        {isMetricChart(currentAttributes) ? (
          <OverrideSwitch
            override={{
              settings: {
                theme: {
                  metric: {
                    border: '#D65757',
                  },
                },
              },
            }}
            value={overrides}
            setOverrideValue={setOverrides}
            rowLabel="Metric override"
            controlLabel="Enable border color"
          />
        ) : null}
        <OverrideSwitch
          override={{
            chart: { title: 'Custom title', description: 'Custom description here' },
          }}
          value={overrides}
          setOverrideValue={setOverrides}
          rowLabel="Custom title"
          controlLabel="Enable custom title"
          helpText={`This override enables custom titles at the visualization level`}
        />
      </div>
    </EuiPopover>
  );
}

export function PanelMenu({
  enableTriggers,
  toggleTriggers,
  enableDefaultAction,
  setEnableDefaultAction,
  enableExtraAction,
  setEnableExtraAction,
}: {
  enableTriggers: boolean;
  enableDefaultAction: boolean;
  enableExtraAction: boolean;
  toggleTriggers: (v: boolean) => void;
  setEnableDefaultAction: (v: boolean) => void;
  setEnableExtraAction: (v: boolean) => void;
}) {
  const [panelPopoverOpen, setPanelPopoverOpen] = useState(false);
  return (
    <EuiPopover
      button={
        <EuiButton
          data-test-subj="lns-example-change-overrides"
          onClick={() => setPanelPopoverOpen(!panelPopoverOpen)}
          iconType="arrowDown"
          iconSide="right"
        >
          Embeddable settings
        </EuiButton>
      }
      isOpen={panelPopoverOpen}
      closePopover={() => setPanelPopoverOpen(false)}
    >
      <div style={{ width: 400 }}>
        <EuiPopoverTitle>Embeddable settings</EuiPopoverTitle>
        <EuiText size="s">
          <p>
            It is possible to control and customize how the Embeddables is shown, disabling the
            interactivity of the chart or filtering out default actions.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow
          label="Enable triggers"
          display="columnCompressedSwitch"
          helpText="This setting controls the interactivity of the chart: when disabled the chart won't bubble any event on user action."
        >
          <EuiSwitch
            showLabel={false}
            label="Enable triggers"
            name="switch"
            checked={enableTriggers}
            onChange={() => {
              toggleTriggers(!enableTriggers);
            }}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow
          label="Enable default action"
          display="columnCompressedSwitch"
          helpText="When disabled the default panel actions (i.e. CSV download)"
        >
          <EuiSwitch
            showLabel={false}
            label="Enable default action"
            name="switch"
            checked={enableDefaultAction}
            onChange={() => {
              setEnableDefaultAction(!enableDefaultAction);
            }}
            compressed
          />
        </EuiFormRow>
        <EuiSpacer />
        <p>It is also possible to pass custom actions to the panel:</p>
        <EuiSpacer />
        <EuiFormRow
          label={
            <EuiToolTip
              display="block"
              content={
                <CodeExample
                  propName="extraActions"
                  code={`[
  {
  id: 'testAction',
  type: 'link',
  getIconType: () => 'save',
  async isCompatible(
  context: ActionExecutionContext<object>
  ): Promise<boolean> {
  return true;
  },
  execute: async (context: ActionExecutionContext<object>) => {
  alert('I am an extra action');
  return;
  },
  getDisplayName: () => 
  'Extra action',
  }
  ]`}
                />
              }
              position="right"
            >
              <span>
                Show custom action <EuiIcon type="questionInCircle" color="subdued" />
              </span>
            </EuiToolTip>
          }
          display="columnCompressedSwitch"
          helpText="Pass a consumer defined action to show in the panel context menu."
        >
          <EuiSwitch
            showLabel={false}
            label="Show custom action"
            name="switch"
            checked={enableExtraAction}
            onChange={() => {
              setEnableExtraAction(!enableExtraAction);
            }}
            compressed
          />
        </EuiFormRow>
      </div>
    </EuiPopover>
  );
}
