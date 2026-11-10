/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitivePack } from '@elastic/isomer-sdk';
import type { ReactSceneRenderer } from '@elastic/isomer-primitives-charts';

/** What Kibana resolves a chart for: the user's color scheme, number locale and time zone. */
export interface KibanaChartsRenderContext {
  scheme?: 'light' | 'dark';
  /** An `Intl` locale, such as `de`. */
  locale?: string;
  /** An IANA time zone, such as `Europe/Paris`. */
  timeZone?: string;
}

/** The Kibana settings a chart's render context comes from. */
export interface KibanaChartsSettings {
  /** `theme:darkMode`: `true`, `false`, or `'system'`. */
  darkMode?: boolean | string;
  /** `format:number:defaultLocale`, a Numeral.js locale id such as `de` or `zh-cn`. */
  numberLocale?: string;
  /** `dateFormat:tz`. `Browser` is the browser's time zone, which a server doesn't know. */
  dateFormatTz?: string;
  /** The time zone `Browser` means: the browser's, in a browser. Absent: `UTC`. */
  browserTimeZone?: string;
  /** Whether `system` dark mode is dark, where the host knows. */
  systemDark?: boolean;
}

// Numeral.js locale ids `Intl` doesn't take as they are.
const NUMERAL_LOCALE_ALIASES: Record<string, string> = { chs: 'zh-Hans' };

/** The `Intl` locale for a Numeral.js locale id, such as `de` or `zh-cn`; `en` if there is none. */
export const intlLocaleFor = (numberLocale: string | undefined): string => {
  const id = NUMERAL_LOCALE_ALIASES[numberLocale ?? ''] ?? numberLocale ?? 'en';
  try {
    return Intl.getCanonicalLocales(id)[0] ?? 'en';
  } catch {
    return 'en';
  }
};

/**
 * The render context Kibana's settings give a chart: `theme:darkMode` as the scheme,
 * `format:number:defaultLocale` as the `Intl` locale, and `dateFormat:tz` as the time zone,
 * with `Browser` as the browser's time zone, or UTC where there is no browser.
 */
export const toKibanaChartsRenderContext = ({
  darkMode,
  numberLocale,
  dateFormatTz,
  browserTimeZone,
  systemDark,
}: KibanaChartsSettings): KibanaChartsRenderContext => {
  const dark = darkMode === true || (darkMode === 'system' && systemDark === true);
  const timeZone =
    !dateFormatTz || dateFormatTz === 'Browser' ? browserTimeZone ?? 'UTC' : dateFormatTz;
  return { scheme: dark ? 'dark' : 'light', locale: intlLocaleFor(numberLocale), timeZone };
};

export interface LoadKibanaChartsPackOptions {
  /**
   * Where the pack draws. `browser` registers Elastic Charts' browser engine
   * (`@elastic/isomer-charts-elastic`); `server` registers only `sceneRenderers`, so a server
   * host passes the headless engine there, loaded however it chooses.
   */
  environment: 'browser' | 'server';
  /** Renderers tried before the environment's engine. */
  sceneRenderers?: readonly ReactSceneRenderer[];
  /**
   * The render context for the chart being resolved, read each time a chart resolves. The
   * `snapshot` surface takes no host context, so this is how a host gives an image its user's
   * locale and time zone. A render's own `locale` and `timeZone` win.
   */
  getRenderContext?: () => KibanaChartsRenderContext | undefined;
}

/**
 * Loads Isomer's charts pack for Kibana, on first use: the chart primitives, the browser engine
 * in a browser, and a resolver that reads Kibana's render context. Nothing loads until it is
 * called, so a plugin that never draws a chart never loads them.
 */
export const loadKibanaChartsPack = async ({
  environment,
  sceneRenderers = [],
  getRenderContext,
}: LoadKibanaChartsPackOptions): Promise<PrimitivePack> => {
  const [{ createChartsPack }, { resolveChart }, browserEngine] = await Promise.all([
    import('@elastic/isomer-primitives-charts'),
    import('@elastic/isomer-primitives-charts/resolve'),
    environment === 'browser' ? import('@elastic/isomer-charts-elastic') : undefined,
  ]);
  return createChartsPack({
    resolveScene: (node, options) => {
      const context = getRenderContext?.();
      return resolveChart(node, {
        ...options,
        locale: options.locale ?? context?.locale,
        timeZone: options.timeZone ?? context?.timeZone,
      });
    },
    sceneRenderers: [
      ...sceneRenderers,
      ...(browserEngine ? [browserEngine.createElasticChartsRenderer()] : []),
    ],
  });
};
