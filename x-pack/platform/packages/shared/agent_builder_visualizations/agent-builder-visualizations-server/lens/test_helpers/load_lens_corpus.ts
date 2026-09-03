/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  LensConfigBuilder,
  type LensAttributes,
  type LensApiConfig,
} from '@kbn/lens-embeddable-utils';
import { isRecord } from '../is_record';

const CORPUS_REL =
  'src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/tests/integrations/lens_panels.json.gz';

export interface CorpusPanel {
  attributes: LensAttributes;
  panel_title?: string;
  package_name?: string;
}

export interface ConvertedPanel {
  title?: string;
  attributes: LensAttributes;
  config: Record<string, unknown>;
}

const builder = new LensConfigBuilder(undefined, true);

export const corpusPath = (): string | undefined => {
  const candidates = [
    path.join(process.cwd(), CORPUS_REL),
    path.resolve(__dirname, '../../../../../../../../', CORPUS_REL),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

export const loadLensCorpus = (): CorpusPanel[] | undefined => {
  const file = corpusPath();
  if (!file) {
    return undefined;
  }
  const parsed = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  return parsed.filter(
    (panel): panel is CorpusPanel => isRecord(panel) && isRecord(panel.attributes)
  );
};

export const convertCorpusPanels = (panels: CorpusPanel[]): ConvertedPanel[] => {
  const converted: ConvertedPanel[] = [];
  for (const panel of panels) {
    try {
      if (!builder.isSupported(panel.attributes.visualizationType)) {
        continue;
      }
      const config = builder.toAPIFormat(panel.attributes) as LensApiConfig &
        Record<string, unknown>;
      converted.push({
        title: panel.panel_title,
        attributes: panel.attributes,
        config: config as Record<string, unknown>,
      });
    } catch {
      continue;
    }
  }
  return converted;
};

export const firstEsqlQuery = (config: Record<string, unknown>): string | undefined => {
  const carriers = Array.isArray(config.layers) ? config.layers : [config];
  for (const carrier of carriers) {
    if (isRecord(carrier) && isRecord(carrier.data_source) && carrier.data_source.type === 'esql') {
      return typeof carrier.data_source.query === 'string' ? carrier.data_source.query : undefined;
    }
  }
  return undefined;
};

export const isEsqlConfig = (config: Record<string, unknown>): boolean =>
  firstEsqlQuery(config) !== undefined;

const collectOperations = (value: unknown, operations: string[]): void => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectOperations(entry, operations));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.operation === 'string') {
    operations.push(value.operation);
  }
  Object.values(value).forEach((child) => collectOperations(child, operations));
};

const collectColumns = (value: unknown, columns: string[]): void => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectColumns(entry, columns));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.column === 'string') {
    columns.push(value.column);
  }
  Object.values(value).forEach((child) => collectColumns(child, columns));
};

export const dataIntent = (
  config: Record<string, unknown>
): { queries: string[]; columns: string[]; operations: string[] } => {
  const queries: string[] = [];
  const carriers = Array.isArray(config.layers) ? config.layers : [config];
  for (const carrier of carriers) {
    if (
      isRecord(carrier) &&
      isRecord(carrier.data_source) &&
      typeof carrier.data_source.query === 'string'
    ) {
      queries.push(carrier.data_source.query);
    }
  }
  const columns: string[] = [];
  collectColumns(config, columns);
  const operations: string[] = [];
  collectOperations(config, operations);
  return {
    queries,
    columns: [...columns].sort(),
    operations: [...operations].sort(),
  };
};
