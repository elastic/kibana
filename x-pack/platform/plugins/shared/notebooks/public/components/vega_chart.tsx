/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { injectVegaTable, parseVegaSpec, toVegaRecords } from '../model/vega_spec';

const RENDER_ERROR_TITLE = i18n.translate('xpack.notebook.vegaCell.renderError', {
  defaultMessage: 'Failed to render the spec',
});

const chartCss = css`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

/** The spec rendered with the table injected as its `table` dataset. */
export const VegaChart = ({ spec, table }: { spec: string; table: Datatable | undefined }) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string>();
  const parsed = useMemo(() => {
    const result = parseVegaSpec(spec);
    return 'error' in result ? result : injectVegaTable(result, table ? toVegaRecords(table) : []);
  }, [spec, table]);
  const text = euiTheme.colors.textParagraph;
  const line = euiTheme.border.color;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || 'error' in parsed) return;
    // Vega reuses an svg it finds in its element, so a render still in flight would draw into the next one's.
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    container.replaceChildren(host);
    let isCurrent = true;
    let cleanup: (() => void) | undefined;
    setRenderError(undefined);
    import('./vega_render')
      .then(({ renderVega }) => renderVega(host, parsed, { text, line }))
      .then((render) => {
        if (!isCurrent) {
          render.destroy();
          return;
        }
        const observer = new ResizeObserver(([entry]) =>
          render.resize(entry.contentRect.width, entry.contentRect.height)
        );
        observer.observe(host);
        cleanup = () => {
          observer.disconnect();
          render.destroy();
        };
      })
      .catch((error: Error) => {
        if (isCurrent) setRenderError(error.message);
      });
    return () => {
      isCurrent = false;
      cleanup?.();
      host.remove();
    };
  }, [parsed, text, line]);

  const error = 'error' in parsed ? parsed.error : renderError;
  return (
    <>
      {error && (
        <KbnDangerCallout announceOnMount size="s" title={RENDER_ERROR_TITLE}>
          {error}
        </KbnDangerCallout>
      )}
      <div
        ref={containerRef}
        css={chartCss}
        hidden={Boolean(error)}
        data-test-subj="notebookVegaChart"
      />
    </>
  );
};
