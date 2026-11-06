/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiPanel, EuiSkeletonText, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ESQLColumn } from '@kbn/es-types';
import {
  stripMarkdownFences,
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
} from '@kbn/custom-content-common';
import { applyHtmlTheme, fillTemplate, sanitizeHtml } from '@kbn/custom-content-renderer';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { DataState } from './data_state';

const NO_DATA: SourceData = { columns: [], rows: [] };

type Rendered = { html: string } | { error: string } | undefined;

/**
 * The template filled with the rows, cleaned and themed, as custom content does it. The markup is
 * written by a model or an author, so it is only ever shown through `sanitizeHtml` and in a frame
 * that cannot run scripts or reach the network.
 */
const useRenderedTemplate = (template: string, data: SourceData): Rendered => {
  const { euiTheme, colorMode } = useEuiTheme();
  const [rendered, setRendered] = useState<Rendered>();

  useEffect(() => {
    let isCurrent = true;
    fillTemplate(stripMarkdownFences(template), data.columns as ESQLColumn[], [
      ...data.rows.map((row) => [...row]),
    ])
      .then((filled) => {
        if (isCurrent)
          setRendered({ html: applyHtmlTheme(sanitizeHtml(filled), colorMode, euiTheme) });
      })
      .catch((error: Error) => {
        if (isCurrent) setRendered({ error: error.message });
      });
    return () => {
      isCurrent = false;
    };
  }, [template, data, colorMode, euiTheme]);

  return rendered;
};

/** Below this a measurement is a collapsed document, not a template that is that short. */
const MIN_MEASURED_HEIGHT = 8;

/**
 * How tall the cleaned template is at the width of its frame. The template is shown in a frame
 * that can do nothing, which nobody can measure, so it is measured in a second one that is
 * hidden, short-lived and has no permission but to be read: it still cannot run a script or reach
 * the network, and only a number leaves it. What the template declared is the answer until then.
 */
const MeasuringFrame = ({
  html,
  onHeight,
}: {
  html: string;
  onHeight: (height: number) => void;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(wrapper);

  const measure = useCallback(() => {
    const height = frame.current?.contentDocument?.documentElement?.scrollHeight;
    if (height !== undefined && height >= MIN_MEASURED_HEIGHT) {
      onHeight(Math.min(CUSTOM_CONTENT_MAX_HEIGHT, Math.ceil(height)));
    }
  }, [onHeight]);

  // The text wraps differently at another width, so it is read again.
  useEffect(measure, [measure, width]);

  // Read once the document has loaded, and again when a new one does.
  useEffect(() => {
    const element = frame.current;
    element?.addEventListener('load', measure);
    return () => element?.removeEventListener('load', measure);
  }, [measure]);

  return (
    <div
      ref={setWrapper}
      aria-hidden="true"
      css={css({
        position: 'absolute',
        inset: 0,
        height: 0,
        overflow: 'hidden',
        visibility: 'hidden',
      })}
    >
      <iframe
        ref={frame}
        // Same-origin so that its height can be read, and nothing else: no scripts.
        sandbox="allow-same-origin"
        srcDoc={html}
        tabIndex={-1}
        title={i18n.translate('xpack.customApp.customContent.measureFrameTitle', {
          defaultMessage: 'Size of the custom content',
        })}
        data-test-subj="customAppCustomContentMeasure"
        css={css({ display: 'block', width: '100%', height: 1, border: 'none' })}
      />
    </div>
  );
};

const TemplateFrame = ({
  node,
  data,
}: {
  node: AppNodeOfType<'custom_content'>;
  data: SourceData;
}) => {
  const rendered = useRenderedTemplate(node.template ?? '', data);
  const [measured, setMeasured] = useState<number>();

  if (!rendered) return <EuiSkeletonText lines={2} isLoading />;
  if ('error' in rendered) {
    return (
      <KbnDangerCallout
        size="s"
        announceOnMount={false}
        title={i18n.translate('xpack.customApp.customContent.errorTitle', {
          defaultMessage: 'This template cannot be shown',
        })}
      >
        <p>{rendered.error}</p>
      </KbnDangerCallout>
    );
  }

  return (
    <div css={css({ position: 'relative' })}>
      <MeasuringFrame html={rendered.html} onHeight={setMeasured} />
      <iframe
        // No permissions at all: no scripts, no forms, no same-origin access.
        sandbox=""
        srcDoc={rendered.html}
        title={i18n.translate('xpack.customApp.customContent.frameTitle', {
          defaultMessage: 'Custom content',
        })}
        data-test-subj="customAppCustomContentFrame"
        css={css({
          display: 'block',
          width: '100%',
          height: measured ?? node.height ?? CUSTOM_CONTENT_DEFAULT_HEIGHT,
          border: 'none',
          background: 'transparent',
        })}
      />
    </div>
  );
};

const WithData = ({ node }: { node: AppNodeOfType<'custom_content'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <DataState state={state} onRetry={layer.retry} handlesEmpty>
      {(data) => <TemplateFrame node={node} data={data} />}
    </DataState>
  );
};

export const CustomContentNode = ({ node }: { node: AppNodeOfType<'custom_content'> }) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="none" data-node-id={node.id}>
    {node.query ? <WithData node={node} /> : <TemplateFrame node={node} data={NO_DATA} />}
  </EuiPanel>
);
