/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder, lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { EXEMPLARS_APP_ID, EXEMPLARS_EXTENSION_ID, type Exemplar } from './exemplars_extension';
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

const ExemplarFlyout = ({ exemplar, onClose }: { exemplar: Exemplar; onClose: () => void }) => (
  <EuiFlyout onClose={onClose} size="s" aria-labelledby="exemplarFlyoutTitle">
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id="exemplarFlyoutTitle">Exemplar</h2>
      </EuiTitle>
      {exemplar.simulated && <EuiBadge color="hollow">Simulated</EuiBadge>}
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiDescriptionList
        type="row"
        compressed
        listItems={Object.entries(exemplar.fields)
          .filter(([, value]) => value != null)
          .map(([title, value]) => ({ title, description: String(value) }))}
      />
    </EuiFlyoutBody>
  </EuiFlyout>
);

export const App = ({
  plugins,
  selectedExemplar$,
}: {
  plugins: StartDependencies;
  selectedExemplar$: BehaviorSubject<Exemplar | undefined>;
}) => {
  const [presetId, setPresetId] = useState<PresetId>('sampleLogs');
  const [draftQuery, setDraftQuery] = useState<string>(PRESETS.sampleLogs);
  const [query, setQuery] = useState<string>(PRESETS.sampleLogs);
  const [showExemplars, setShowExemplars] = useState(true);
  const selectedExemplar = useObservable(selectedExemplar$, undefined);

  const LensComponent = plugins.lens.EmbeddableComponent;
  const extensions = useMemo(() => ({ [EXEMPLARS_EXTENSION_ID]: showExemplars }), [showExemplars]);
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
            title="Exemplars are drawn by a Lens extension registered by this plugin"
            text={
              <p>
                Nothing is stored in the chart. The extension matches ES|QL layers with a STATS
                command rendered by this app, and fetches its points after the chart has loaded.
                Keep the <code>bucket</code> and <code>value</code> column names when editing the
                query.
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
              executionContext={{ type: 'application', name: EXEMPLARS_APP_ID }}
              extensions={extensions}
            />
          ) : (
            <EuiCodeBlock language="text">{attributes.error}</EuiCodeBlock>
          )}
        </EuiPageSection>
      </EuiPageBody>
      {selectedExemplar && (
        <ExemplarFlyout
          exemplar={selectedExemplar}
          onClose={() => selectedExemplar$.next(undefined)}
        />
      )}
    </EuiPage>
  );
};
