/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { getContentHash, validateSvgIcon } from './icon';
import { materializeDeclarativeConnectorSpec } from './materialize_spec';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import type { RawConnectorSpecAsset } from './spec_source';
import type { DeclarativeConnectorSpec } from './types';

/** One materialized spec version together with the parsed YAML it came from. */
export interface MaterializedSpec {
  id: string;
  version: string;
  contentHash: string;
  declarative: DeclarativeConnectorSpec;
  spec: ConnectorSpec;
}

const toIconDataUrl = (iconRaw: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(iconRaw, 'utf8').toString('base64')}`;

/** Materializes one raw YAML/icon asset into a `ConnectorSpec`. */
export const loadDeclarativeConnectorSpec = (asset: RawConnectorSpecAsset): ConnectorSpec =>
  materializeDeclarativeAsset(asset).spec;

/** Materializes one raw YAML/icon asset and keeps the parsed definition for compatibility checks. */
export const materializeDeclarativeAsset = (asset: RawConnectorSpecAsset): MaterializedSpec => {
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

  return {
    id: parsed.id,
    version: parsed.version,
    contentHash: getContentHash(asset.yaml),
    declarative: parsed,
    spec: materializeDeclarativeConnectorSpec(parsed, iconDataUrl),
  };
};
