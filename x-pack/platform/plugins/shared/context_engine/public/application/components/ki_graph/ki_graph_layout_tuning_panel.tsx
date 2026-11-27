/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiRange,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  copyToClipboard,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ForceLayoutParams, KiGraphCenterBy, KiGraphCenterParams } from './force_layout';
import type { KiGraphNodeSizeMode, KiGraphNodeSizeParams } from './ki_graph_node_size';
import type { KiGraphLayoutTuningParams } from './use_ki_graph_layout';
import { DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS } from './use_ki_graph_layout';

interface KiGraphLayoutTuningPanelProps {
  value: KiGraphLayoutTuningParams;
  layoutDurationMs: number;
  onChange: (next: KiGraphLayoutTuningParams) => void;
}

const panelShellCss = {
  maxWidth: 340,
  maxHeight: 'min(70vh, 520px)',
  overflowY: 'auto' as const,
};

const labelHintCss = css({
  textDecoration: 'underline dotted',
  cursor: 'help',
});

const DEFAULT_MANUAL_TICKS = 300;
const DEBOUNCE_MS = 300;

const PARAM_DESCRIPTIONS: Record<string, string> = {
  manyBodyStrength:
    'Repulsion strength: how hard every node pushes all others away. More negative spreads the graph out and separates clusters; closer to 0 packs nodes tightly. The strongest knob for overall spread.',
  manyBodyDistanceMax:
    'Repulsion reach: how far apart nodes can feel each other’s push. Raising it lets repulsion act across the whole graph; lowering it keeps pushes local and can leave distant clusters unmixed.',
  gravity:
    'Center gravity: gentle pull toward the origin (0,0). Higher values tug the whole graph inward and tighten the blob; lower values let repulsion dominate and the graph drift wider.',
  linkStrength:
    'Link spring strength: how strongly edges pull their endpoints together. Higher values shorten links and knit neighbors tight; lower values let repulsion win and edges stretch longer.',
  linkRestBase:
    'Link rest length base: the target gap along an edge before degree-based extras. Larger values space linked nodes farther; smaller values bring connected pairs closer.',
  linkRestPerDegree:
    'Link rest per degree: extra target length when the less-connected end has more links. Higher values give busy nodes more breathing room along each edge.',
  collisionGap:
    'Collision gap: extra padding beyond node radius so circles do not overlap. Increase to add whitespace between glyphs; decrease to pack nodes denser.',
  collisionStrength:
    'Collision strength: how firmly overlapping nodes are pushed apart each tick. Higher values fight overlap harder; lower values may let slight overlaps persist.',
  collisionIterations:
    'Collision solver passes: how many collision correction rounds run per simulation tick. More passes reduce overlap but cost time per tick.',
  mode: 'Size mode: what drives node diameter. Connections, occurrences, or both scale size; uniform sets every node to the same base size with no ranking.',
  baseSize:
    'Base size: the reference diameter before scaling (or the fixed diameter in uniform mode). Raising it makes all nodes larger; lowering it shrinks the whole graph visually.',
  scaleMin:
    'Scale floor: multiplier for the least important nodes. Higher values keep small nodes readable; lower values shrink quiet nodes more.',
  scaleRange:
    'Scale range: how much size can grow from the floor to the maximum rank. Wider range exaggerates hub vs. leaf size; narrower range evens sizes out.',
  minSize:
    'Minimum size: smallest allowed node diameter in pixels. Prevents tiny nodes from disappearing; lowering it allows smaller glyphs.',
  maxSize:
    'Maximum size: largest allowed node diameter in pixels. Caps hub size so monsters do not dominate; raising it lets top nodes grow bigger.',
  degreeMax:
    'Degree for full scale: connection count treated as “max importance” for sizing. Lower values make modest degree look large; higher values require more links to reach full size.',
  occurrencesMax:
    'Occurrences for full scale: occurrence count treated as “max importance” for sizing. Same idea as degree cap but for document frequency.',
  centerBy:
    'Center ranking: which metric orders nodes for seeding, pinning, and radial rings. Connections favors hubs; occurrences favors frequent entities; none keeps input order.',
  pinCenterNode:
    'Pin center node: fixes the top-ranked node at the origin so it cannot drift. Useful to keep the main hub dead center while the rest relax around it.',
  radialStrength:
    'Radial pull: when above zero, nodes are attracted to rings at set distances from the center. Higher strength enforces ring layout more tightly; zero disables rings.',
  radialSpacing:
    'Radial spacing: distance between importance rings (radius grows with the square root of rank). Larger spacing spreads rings outward; smaller keeps ranks closer together.',
  velocityDecay:
    'Velocity decay: friction that slows node motion each tick. Higher values settle the layout faster with less jitter; lower values keep the simulation more lively.',
  alphaDecay:
    'Alpha decay: how quickly simulation “heat” cools toward a stop. Faster decay finishes sooner but may freeze early; slower decay allows longer refinement.',
  manyBodyTheta:
    'Repulsion accuracy (theta): Barnes–Hut approximation tradeoff. Lower is more accurate and slower; higher is faster but can mis-estimate forces on large graphs.',
  simulationTicks:
    'Simulation ticks: how many force steps run per layout. Auto scales with node count; a fixed count repeats the same work regardless of graph size.',
};

const cloneTuningParams = (params: KiGraphLayoutTuningParams): KiGraphLayoutTuningParams => ({
  force: {
    ...params.force,
    ticks: params.force.ticks === 'auto' ? 'auto' : params.force.ticks,
  },
  nodeSize: { ...params.nodeSize },
  center: { ...params.center },
});

const paramsEqual = (a: KiGraphLayoutTuningParams, b: KiGraphLayoutTuningParams): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const TooltipFieldLabel = ({ name, text }: { name: string; text: string }) => (
  <EuiToolTip position="left" content={PARAM_DESCRIPTIONS[name]}>
    <span tabIndex={0} css={labelHintCss}>
      {text}
    </span>
  </EuiToolTip>
);

interface ParamRangeProps {
  paramKey: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const ParamRange = ({ paramKey, label, value, min, max, step, onChange }: ParamRangeProps) => (
  <EuiFormRow
    label={<TooltipFieldLabel name={paramKey} text={label} />}
    display="columnCompressed"
    fullWidth
  >
    <EuiRange
      fullWidth
      compressed
      showInput
      showLabels={false}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
    />
  </EuiFormRow>
);

interface TuningSectionProps {
  id: string;
  title: string;
  summary: string;
  initialIsOpen?: boolean;
  children: ReactNode;
}

const TuningSection = ({ id, title, summary, initialIsOpen, children }: TuningSectionProps) => (
  <EuiAccordion
    id={id}
    buttonContent={
      <div>
        <EuiText size="xs">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {summary}
        </EuiText>
      </div>
    }
    initialIsOpen={initialIsOpen ?? false}
    paddingSize="s"
  >
    {children}
  </EuiAccordion>
);

const CENTER_BY_OPTIONS: Array<{ value: KiGraphCenterBy; text: string }> = [
  { value: 'connections', text: 'Connections (degree)' },
  { value: 'occurrences', text: 'Occurrences' },
  { value: 'none', text: 'Input order' },
];

const isKiGraphCenterBy = (raw: string): raw is KiGraphCenterBy =>
  raw === 'connections' || raw === 'occurrences' || raw === 'none';

const isKiGraphNodeSizeMode = (raw: string): raw is KiGraphNodeSizeMode =>
  raw === 'connections' || raw === 'occurrences' || raw === 'both' || raw === 'uniform';

const NODE_SIZE_MODE_OPTIONS: Array<{ value: KiGraphNodeSizeMode; text: string }> = [
  { value: 'both', text: 'Connections and occurrences' },
  { value: 'connections', text: 'Connections only' },
  { value: 'occurrences', text: 'Occurrences only' },
  { value: 'uniform', text: 'Uniform' },
];

export const KiGraphLayoutTuningPanel = ({
  value,
  layoutDurationMs,
  onChange,
}: KiGraphLayoutTuningPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<KiGraphLayoutTuningParams>(() => cloneTuningParams(value));
  const skipApplyOnDraftChangeRef = useRef(true);

  useEffect(() => {
    setDraft(cloneTuningParams(value));
  }, [value]);

  useEffect(() => {
    if (skipApplyOnDraftChangeRef.current) {
      skipApplyOnDraftChangeRef.current = false;
      return;
    }
    if (paramsEqual(draft, value)) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (!paramsEqual(draft, value)) {
        onChange(cloneTuningParams(draft));
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, onChange, value]);

  const updateForce = useCallback((partial: Partial<ForceLayoutParams>) => {
    setDraft((current) => ({ ...current, force: { ...current.force, ...partial } }));
  }, []);

  const updateNodeSize = useCallback((partial: Partial<KiGraphNodeSizeParams>) => {
    setDraft((current) => ({ ...current, nodeSize: { ...current.nodeSize, ...partial } }));
  }, []);

  const updateCenter = useCallback((partial: Partial<KiGraphCenterParams>) => {
    setDraft((current) => ({ ...current, center: { ...current.center, ...partial } }));
  }, []);

  const ticksIsAuto = draft.force.ticks === 'auto';
  const manualTicks = ticksIsAuto ? DEFAULT_MANUAL_TICKS : draft.force.ticks;
  const isUniformSize = draft.nodeSize.mode === 'uniform';

  const handleReset = useCallback(() => {
    setDraft(cloneTuningParams(DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS));
  }, []);

  const handleCopy = useCallback(() => {
    copyToClipboard(JSON.stringify(draft, null, 2));
  }, [draft]);

  const durationLabel = layoutDurationMs >= 0 ? `${Math.round(layoutDurationMs)} ms` : '—';

  return (
    <div>
      <EuiButtonEmpty
        size="s"
        iconType={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
        onClick={() => setIsOpen((v) => !v)}
      >
        Layout tuning
      </EuiButtonEmpty>
      {isOpen ? (
        <EuiPanel paddingSize="s" hasShadow css={panelShellCss}>
          <EuiText size="xs" color="subdued">
            Last layout: {durationLabel}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiForm component="div">
            <TuningSection
              id="ki-graph-tuning-spread"
              title="Spread"
              summary="Repulsion between nodes and pull toward the origin."
              initialIsOpen
            >
              <ParamRange
                paramKey="manyBodyStrength"
                label="Repulsion strength"
                value={draft.force.manyBodyStrength}
                min={-400}
                max={0}
                step={5}
                onChange={(manyBodyStrength) => updateForce({ manyBodyStrength })}
              />
              <ParamRange
                paramKey="manyBodyDistanceMax"
                label="Repulsion reach"
                value={draft.force.manyBodyDistanceMax}
                min={50}
                max={2000}
                step={10}
                onChange={(manyBodyDistanceMax) => updateForce({ manyBodyDistanceMax })}
              />
              <ParamRange
                paramKey="gravity"
                label="Center gravity"
                value={draft.force.gravity}
                min={0}
                max={0.2}
                step={0.002}
                onChange={(gravity) => updateForce({ gravity })}
              />
            </TuningSection>

            <EuiHorizontalRule margin="s" />

            <TuningSection
              id="ki-graph-tuning-edges"
              title="Edges"
              summary="Spring forces along links between nodes."
            >
              <ParamRange
                paramKey="linkStrength"
                label="Link spring strength"
                value={draft.force.linkStrength}
                min={0}
                max={1}
                step={0.01}
                onChange={(linkStrength) => updateForce({ linkStrength })}
              />
              <ParamRange
                paramKey="linkRestBase"
                label="Link rest length base"
                value={draft.force.linkRestBase}
                min={10}
                max={300}
                step={1}
                onChange={(linkRestBase) => updateForce({ linkRestBase })}
              />
              <ParamRange
                paramKey="linkRestPerDegree"
                label="Link rest per degree"
                value={draft.force.linkRestPerDegree}
                min={0}
                max={30}
                step={1}
                onChange={(linkRestPerDegree) => updateForce({ linkRestPerDegree })}
              />
            </TuningSection>

            <EuiHorizontalRule margin="s" />

            <TuningSection
              id="ki-graph-tuning-overlap"
              title="Overlap"
              summary="Collision padding and how hard overlaps are resolved."
            >
              <ParamRange
                paramKey="collisionGap"
                label="Collision gap"
                value={draft.force.collisionGap}
                min={0}
                max={40}
                step={1}
                onChange={(collisionGap) => updateForce({ collisionGap })}
              />
              <ParamRange
                paramKey="collisionStrength"
                label="Collision strength"
                value={draft.force.collisionStrength}
                min={0}
                max={1}
                step={0.05}
                onChange={(collisionStrength) => updateForce({ collisionStrength })}
              />
              <ParamRange
                paramKey="collisionIterations"
                label="Collision solver passes"
                value={draft.force.collisionIterations}
                min={1}
                max={10}
                step={1}
                onChange={(collisionIterations) => updateForce({ collisionIterations })}
              />
            </TuningSection>

            <EuiHorizontalRule margin="s" />

            <TuningSection
              id="ki-graph-tuning-node-size"
              title="Node size"
              summary="How node diameter is chosen from metrics."
            >
              <EuiFormRow
                label={<TooltipFieldLabel name="mode" text="Size mode" />}
                display="columnCompressed"
                fullWidth
              >
                <EuiSelect
                  compressed
                  options={NODE_SIZE_MODE_OPTIONS}
                  value={draft.nodeSize.mode}
                  onChange={(e) => {
                    const { value: next } = e.target;
                    if (isKiGraphNodeSizeMode(next)) {
                      updateNodeSize({ mode: next });
                    }
                  }}
                />
              </EuiFormRow>
              <ParamRange
                paramKey="baseSize"
                label="Base size"
                value={draft.nodeSize.baseSize}
                min={8}
                max={60}
                step={1}
                onChange={(baseSize) => updateNodeSize({ baseSize })}
              />
              <ParamRange
                paramKey="minSize"
                label="Minimum size"
                value={draft.nodeSize.minSize}
                min={8}
                max={40}
                step={1}
                onChange={(minSize) => updateNodeSize({ minSize })}
              />
              <ParamRange
                paramKey="maxSize"
                label="Maximum size"
                value={draft.nodeSize.maxSize}
                min={20}
                max={120}
                step={1}
                onChange={(maxSize) => updateNodeSize({ maxSize })}
              />
              {isUniformSize ? null : (
                <>
                  <ParamRange
                    paramKey="scaleMin"
                    label="Scale floor"
                    value={draft.nodeSize.scaleMin}
                    min={0}
                    max={3}
                    step={0.05}
                    onChange={(scaleMin) => updateNodeSize({ scaleMin })}
                  />
                  <ParamRange
                    paramKey="scaleRange"
                    label="Scale range"
                    value={draft.nodeSize.scaleRange}
                    min={0}
                    max={3}
                    step={0.05}
                    onChange={(scaleRange) => updateNodeSize({ scaleRange })}
                  />
                  <ParamRange
                    paramKey="degreeMax"
                    label="Degree for full scale"
                    value={draft.nodeSize.degreeMax}
                    min={1}
                    max={50}
                    step={1}
                    onChange={(degreeMax) => updateNodeSize({ degreeMax })}
                  />
                  <ParamRange
                    paramKey="occurrencesMax"
                    label="Occurrences for full scale"
                    value={draft.nodeSize.occurrencesMax}
                    min={1}
                    max={200}
                    step={1}
                    onChange={(occurrencesMax) => updateNodeSize({ occurrencesMax })}
                  />
                </>
              )}
            </TuningSection>

            <EuiHorizontalRule margin="s" />

            <TuningSection
              id="ki-graph-tuning-center"
              title="Center"
              summary="Which node anchors the layout and optional radial rings."
              initialIsOpen
            >
              <EuiFormRow
                label={<TooltipFieldLabel name="centerBy" text="Center ranking" />}
                display="columnCompressed"
                fullWidth
              >
                <EuiSelect
                  compressed
                  options={CENTER_BY_OPTIONS}
                  value={draft.center.centerBy}
                  onChange={(e) => {
                    const { value: next } = e.target;
                    if (isKiGraphCenterBy(next)) {
                      updateCenter({ centerBy: next });
                    }
                  }}
                />
              </EuiFormRow>
              <EuiFormRow
                label={<TooltipFieldLabel name="pinCenterNode" text="Pin center node" />}
                display="columnCompressed"
                fullWidth
              >
                <EuiSwitch
                  label="Fix top-ranked node at origin"
                  checked={draft.center.pinCenterNode}
                  onChange={(e) => updateCenter({ pinCenterNode: e.target.checked })}
                />
              </EuiFormRow>
              <ParamRange
                paramKey="radialStrength"
                label="Radial pull"
                value={draft.center.radialStrength}
                min={0}
                max={1}
                step={0.01}
                onChange={(radialStrength) => updateCenter({ radialStrength })}
              />
              <ParamRange
                paramKey="radialSpacing"
                label="Radial spacing"
                value={draft.center.radialSpacing}
                min={10}
                max={200}
                step={1}
                onChange={(radialSpacing) => updateCenter({ radialSpacing })}
              />
            </TuningSection>

            <EuiHorizontalRule margin="s" />

            <TuningSection
              id="ki-graph-tuning-simulation"
              title="Simulation"
              summary="Tick count, cooling, and repulsion accuracy."
            >
              <EuiFormRow
                label={<TooltipFieldLabel name="simulationTicks" text="Simulation ticks" />}
                display="columnCompressed"
                fullWidth
              >
                <>
                  <EuiSwitch
                    label="Auto ticks"
                    checked={ticksIsAuto}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateForce({ ticks: 'auto' });
                      } else {
                        updateForce({ ticks: manualTicks });
                      }
                    }}
                  />
                  {ticksIsAuto ? null : (
                    <>
                      <EuiSpacer size="s" />
                      <EuiRange
                        fullWidth
                        compressed
                        showInput
                        min={10}
                        max={1000}
                        step={10}
                        value={manualTicks}
                        onChange={(e) => updateForce({ ticks: Number(e.currentTarget.value) })}
                      />
                    </>
                  )}
                </>
              </EuiFormRow>
              <ParamRange
                paramKey="alphaDecay"
                label="Alpha decay"
                value={draft.force.alphaDecay}
                min={0.001}
                max={0.1}
                step={0.001}
                onChange={(alphaDecay) => updateForce({ alphaDecay })}
              />
              <ParamRange
                paramKey="velocityDecay"
                label="Velocity decay"
                value={draft.force.velocityDecay}
                min={0.05}
                max={0.9}
                step={0.01}
                onChange={(velocityDecay) => updateForce({ velocityDecay })}
              />
              <ParamRange
                paramKey="manyBodyTheta"
                label="Repulsion accuracy (theta)"
                value={draft.force.manyBodyTheta}
                min={0.3}
                max={1.5}
                step={0.05}
                onChange={(manyBodyTheta) => updateForce({ manyBodyTheta })}
              />
            </TuningSection>
          </EuiForm>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleReset}>
                Reset to defaults
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" iconType="copy" onClick={handleCopy}>
                Copy values
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : null}
    </div>
  );
};
