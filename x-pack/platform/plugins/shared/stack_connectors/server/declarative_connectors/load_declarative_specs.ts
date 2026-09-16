/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import type { Logger } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { getContentHash, validateSvgIcon } from './icon';
import { materializeDeclarativeConnectorSpec } from './materialize_spec';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import type { ConnectorSpecSource, RawConnectorSpecAsset } from './spec_source';

const toIconDataUrl = (iconRaw: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(iconRaw, 'utf8').toString('base64')}`;

const loadOne = (asset: RawConnectorSpecAsset): ConnectorSpec => {
  const parsed = parseDeclarativeConnectorSpec(asset.yaml);
  let iconDataUrl: string | undefined;

  if (parsed.metadata.icon) {
    if (asset.icon === undefined) {
      throw new Error(
        `Declarative connector "${parsed.id}" declares an icon but no icon file was provided at ${asset.yamlPath}.`
      );
    }
    const actualHash = getContentHash(asset.icon);
    if (actualHash !== parsed.metadata.icon.contentHash) {
      throw new Error(
        `Declarative connector icon for "${parsed.id}" failed its integrity check. Expected ${parsed.metadata.icon.contentHash}, received ${actualHash}.`
      );
    }
    validateSvgIcon(asset.icon);
    iconDataUrl = toIconDataUrl(asset.icon);
  }

  return materializeDeclarativeConnectorSpec(parsed, iconDataUrl);
};

export const loadDeclarativeConnectorSpecs = (
  source: ConnectorSpecSource,
  logger: Logger
): ConnectorSpec[] => {
  const specs: ConnectorSpec[] = [];
  const seenIds = new Map<string, string>();

  for (const asset of source.loadRawSpecs()) {
    let spec: ConnectorSpec;
    try {
      spec = loadOne(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load declarative connector spec from ${asset.yamlPath}: ${message}`,
        {
          cause: error,
        }
      );
    }

    const existingPath = seenIds.get(spec.metadata.id);
    if (existingPath) {
      throw new Error(
        `Duplicate declarative connector id "${spec.metadata.id}" in ${asset.yamlPath} (already loaded from ${existingPath}).`
      );
    }
    seenIds.set(spec.metadata.id, asset.yamlPath);
    logger.debug(`Loaded declarative connector spec "${spec.metadata.id}" from ${asset.yamlPath}`);
    specs.push(spec);
  }

  return specs;
};
