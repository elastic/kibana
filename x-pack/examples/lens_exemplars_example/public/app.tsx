/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder, lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { EXEMPLARS_APP_ID, EXEMPLARS_OVERLAY_PROVIDER_ID } from './exemplars_overlay_provider';
import type { StartDependencies } from './plugin';

const PRESETS = {
  sampleLogs:
    'FROM kibana_sample_data_logs\n| STATS value = AVG(bytes) BY bucket = BUCKET(@timestamp, 50, ?_tstart, ?_tend)',
  tsMetrics:
    'TS metrics-*\n| STATS value = AVG(http.server.request.duration) BY bucket = TBUCKET(5 minutes)',
} as const;

type PresetId = keyof typeof PRESETS;

const PRESET_OPTIONS: Array<{ id: PresetId; label: string }> = [
  { id: 'sampleLogs', label: 'Sample web logs (simulated exemplars)' },
  { id: 'tsMetrics', label: 'TS metrics (SET exemplars)' },
];

const TIME_RANGE = { from: 'now-7d', to: 'now' };

const getAttributes = (
  query: string,
  dataViews: StartDependencies['data']['dataViews']
): TypedLensByValueInput['attributes'] =>
  new LensConfigBuilder(dataViews).fromAPIFormat(
    lensApiConfigSchema.parse({
      type: 'xy',
      title: 'Metric with exemplars',
      layers: [
        {
          type: 'line',
          data_source: { type: 'esql', query },
          ignore_global_filters: false,
          sampling: 1,
          x: { column: 'bucket' },
          y: [{ column: 'value' }],
        },
      ],
    })
  ) as TypedLensByValueInput['attributes'];

export const App = ({ plugins }: { plugins: StartDependencies }) => {
  const [presetId, setPresetId] = useState<PresetId>('sampleLogs');
  const [draftQuery, setDraftQuery] = useState<string>(PRESETS.sampleLogs);
  const [query, setQuery] = useState<string>(PRESETS.sampleLogs);
  const [showExemplars, setShowExemplars] = useState(true);

  const LensComponent = plugins.lens.EmbeddableComponent;
  const xyOverlayProviders = useMemo(
    () => ({ [EXEMPLARS_OVERLAY_PROVIDER_ID]: showExemplars }),
    [showExemplars]
  );
  const attributes = useMemo(() => {
    try {
      return { value: getAttributes(query, plugins.data.dataViews) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [query, plugins.data.dataViews]);

  return (
    <EuiPage>
      <EuiPageBody css={{ maxWidth: 1000, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder pageTitle="Lens exemplars" />
        <EuiPageSection paddingSize="s">
          <KbnInfoCallout
            size="s"
            title="Exemplars are drawn by a Lens XY overlay provider registered by this plugin"
            text={
              <p>
                Nothing is stored in the chart. The provider matches ES|QL layers with a STATS
                command rendered by this app, a dashboard or Discover, and fetches its points after
                the chart has loaded. Keep the <code>bucket</code> and <code>value</code> column
                names when editing the query.
              </p>
            }
          />
          <EuiSpacer />
          <EuiButtonGroup
            legend="Query preset"
            options={PRESET_OPTIONS}
            idSelected={presetId}
            onChange={(id) => {
              const nextPresetId = id as PresetId;
              setPresetId(nextPresetId);
              setDraftQuery(PRESETS[nextPresetId]);
              setQuery(PRESETS[nextPresetId]);
            }}
          />
          <EuiSpacer size="s" />
          <EuiTextArea
            fullWidth
            rows={3}
            aria-label="ES|QL query"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => setQuery(draftQuery)}>
                Apply query
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label="Show exemplars"
                checked={showExemplars}
                onChange={(event) => setShowExemplars(event.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          {attributes.value ? (
            <LensComponent
              id="lensExemplarsExample"
              style={{ height: 450 }}
              attributes={attributes.value}
              timeRange={TIME_RANGE}
              viewMode="view"
              executionContext={{ type: EXEMPLARS_APP_ID }}
              xyOverlayProviders={xyOverlayProviders}
            />
          ) : (
            <EuiCodeBlock language="text">{attributes.error}</EuiCodeBlock>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
