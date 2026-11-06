/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { VEGA_EMBEDDABLE_TYPE } from '@kbn/vis-type-vega-plugin/common';
import { injectVegaTable, parseVegaSpec, toVegaRecords } from '../model/vega_spec';

const RENDER_ERROR_TITLE = i18n.translate('xpack.notebook.vegaCell.renderError', {
  defaultMessage: 'Failed to render the spec',
});

const chartCss = css`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

interface VegaPanelState {
  spec: { format: 'json'; value: object };
}

type VegaPanelApi = DefaultEmbeddableApi<VegaPanelState>;

/** The spec with the table injected as its `table` dataset, drawn by the dashboard's Vega panel. */
export const VegaChart = ({ spec, table }: { spec: string; table: Datatable | undefined }) => {
  const parsed = useMemo(() => {
    const result = parseVegaSpec(spec);
    return 'error' in result ? result : injectVegaTable(result, table ? toVegaRecords(table) : []);
  }, [spec, table]);
  const state = useMemo<VegaPanelState | undefined>(
    () => ('error' in parsed ? undefined : { spec: { format: 'json', value: parsed.spec } }),
    [parsed]
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const appliedStateRef = useRef<VegaPanelState>();
  const [api, setApi] = useState<VegaPanelApi>();

  // The panel reads its state once when built; later specs and data are applied to it in place.
  useEffect(() => {
    if (!api || !state || state === appliedStateRef.current) return;
    appliedStateRef.current = state;
    void api.applySerializedState(state);
  }, [api, state]);

  // Filters clicked in the chart have no dashboard to go to.
  const getParentApi = useCallback(
    () => ({
      disableTriggers$: new BehaviorSubject(true),
      getSerializedStateForChild: () => {
        appliedStateRef.current = stateRef.current;
        return stateRef.current;
      },
    }),
    []
  );

  if ('error' in parsed) {
    return (
      <KbnDangerCallout announceOnMount size="s" title={RENDER_ERROR_TITLE}>
        {parsed.error}
      </KbnDangerCallout>
    );
  }
  return (
    <div css={chartCss} data-test-subj="notebookVegaChart">
      <EmbeddableRenderer<VegaPanelState, VegaPanelApi>
        type={VEGA_EMBEDDABLE_TYPE}
        getParentApi={getParentApi}
        onApiAvailable={setApi}
        hidePanelChrome
      />
    </div>
  );
};
