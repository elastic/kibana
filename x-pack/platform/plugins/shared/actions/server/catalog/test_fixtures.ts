/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync } from 'crypto';
import { getContentHash } from './content_hash';
import { definitionDocId } from './catalog_storage';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { signCatalogForTests } from './signature';
import type {
  CatalogManifest,
  CatalogSource,
  CatalogTypeMetadata,
  StoredAsset,
  StoredDefinition,
  StoredManifest,
} from './types';

export const SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';

export const ABUSEIPDB_1_0_YAML = `schemaVersion: 1
id: .abuseipdb
version: "1.0"
config:
  type: object
auth:
  types:
    - type: api_key_header
actions:
  checkIp:
    input:
      type: object
    request:
      method: GET
      path: /api/v2/check
test:
  request:
    method: GET
    path: /api/v2/check
`;

export const ABUSEIPDB_1_1_YAML = ABUSEIPDB_1_0_YAML.replace('version: "1.0"', 'version: "1.1"');

export const OKTA_1_0_YAML = `schemaVersion: 1
id: .okta
version: "1.0"
config:
  type: object
auth:
  types:
    - type: api_key_header
actions:
  listUsers:
    input:
      type: object
    request:
      method: GET
      path: /api/v1/users
test:
  request:
    method: GET
    path: /api/v1/users
`;

export const createTestSigningKeys = (): { publicKeyPem: string; privateKeyPem: string } => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
};

const connectorName = (id: string): string => id.replace(/^\./, '');

export const buildTestCatalog = (opts: {
  rows: Array<{ id: string; version: string; yaml: string; iconSvg?: string }>;
  sequence: number;
  privateKeyPem: string;
  typeMetadata?: Record<string, Partial<CatalogTypeMetadata>>;
  previousCatalogVersion?: string;
  catalogVersion?: string;
}): {
  manifest: CatalogManifest;
  bytes: string;
  signature: string;
  files: Map<string, string>;
} => {
  const files = new Map<string, string>();
  const typeMetadata: Record<string, CatalogTypeMetadata> = {};
  const connectors = opts.rows.map((row) => {
    const name = connectorName(row.id);
    const definitionUrl = `connectors/${name}/${row.version}.yaml`;
    const iconSvg = row.iconSvg ?? SAFE_SVG;
    const iconHash = getContentHash(iconSvg);
    const iconPath = `connectors/${name}/icons/sha256-${iconHash.slice('sha256:'.length)}.svg`;
    files.set(definitionUrl, row.yaml);
    files.set(iconPath, iconSvg);
    const override = opts.typeMetadata?.[row.id];
    typeMetadata[row.id] = {
      displayName: override?.displayName ?? name,
      description: override?.description ?? `${name} connector`,
      docsUrl: override?.docsUrl,
      minimumLicense: override?.minimumLicense ?? 'gold',
      isTechnicalPreview: override?.isTechnicalPreview,
      supportedFeatureIds: override?.supportedFeatureIds ?? ['workflows'],
      icon:
        override && 'icon' in override ? override.icon : { path: iconPath, contentHash: iconHash },
    };
    return {
      id: row.id,
      version: row.version,
      definitionUrl,
      contentHash: getContentHash(row.yaml),
    };
  });
  const manifest: CatalogManifest = {
    schemaVersion: 1,
    catalogVersion: opts.catalogVersion ?? `catalog-${opts.sequence}`,
    sequence: opts.sequence,
    previousCatalogVersion: opts.previousCatalogVersion,
    typeMetadata,
    connectors,
  };
  const bytes = `${JSON.stringify(manifest)}\n`;
  const signature = signCatalogForTests(bytes, opts.privateKeyPem);
  files.set('catalog.json', bytes);
  files.set('catalog.json.sig', signature);
  return { manifest, bytes, signature, files };
};

export interface InMemoryCatalogSource extends CatalogSource {
  reads: string[];
}

export const createInMemoryCatalogSource = (
  files: Map<string, string>,
  options?: { fail?: boolean; hang?: boolean }
): InMemoryCatalogSource => {
  const reads: string[] = [];
  const readFile = async (path: string, signal?: AbortSignal): Promise<string> => {
    if (signal?.aborted) {
      throw new Error('aborted');
    }
    reads.push(path);
    if (options?.hang) {
      return new Promise(() => undefined);
    }
    if (options?.fail) {
      throw new Error('catalog source failed');
    }
    const body = files.get(path) ?? files.get(path.replace(/^\/+/, ''));
    if (body === undefined) {
      throw new Error(`Catalog file not found: ${path}`);
    }
    return body;
  };
  return {
    origin: 'https://workflows.elastic.co',
    reads,
    readManifest: async (signal) => {
      const bytes = await readFile('catalog.json', signal);
      const signature = (await readFile('catalog.json.sig', signal)).trim();
      return { bytes, signature };
    },
    readText: (path, _maxBytes, signal) => readFile(path, signal),
  };
};

export const createInMemoryStorage = (): ConnectorCatalogStorage => {
  let manifest: StoredManifest | undefined;
  const definitions = new Map<string, StoredDefinition>();
  const assets = new Map<string, StoredAsset>();
  const storage: ConnectorCatalogStorage = {
    getManifest: async () => manifest,
    putManifest: async (next, previousSequence) => {
      if (previousSequence !== undefined && next.sequence <= previousSequence) {
        return 'stale';
      }
      if (
        manifest?.seqNo !== undefined &&
        next.seqNo !== undefined &&
        (next.seqNo !== manifest.seqNo || next.primaryTerm !== manifest.primaryTerm)
      ) {
        return 'stale';
      }
      manifest = {
        ...next,
        seqNo: (manifest?.seqNo ?? 0) + 1,
        primaryTerm: manifest?.primaryTerm ?? 1,
      };
      return 'replaced';
    },
    listDefinitions: async () =>
      [...definitions.values()].map((definition) => ({
        id: definition.id,
        version: definition.version,
        contentHash: definition.contentHash,
      })),
    getDefinition: async (id, version) => definitions.get(definitionDocId(id, version)),
    existsDefinitions: async (keys) => {
      const existing = new Set<string>();
      for (const key of keys) {
        const id = definitionDocId(key.id, key.version);
        if (definitions.has(id)) {
          existing.add(id);
        }
      }
      return existing;
    },
    putDefinitionCreate: async (definition) => {
      const id = definitionDocId(definition.id, definition.version);
      if (definitions.has(id)) {
        return 'exists';
      }
      definitions.set(id, definition);
      return 'created';
    },
    getAssets: async (hashes) => {
      const found = new Map<string, StoredAsset>();
      for (const hash of hashes) {
        const asset = assets.get(hash);
        if (asset) {
          found.set(hash, asset);
        }
      }
      return found;
    },
    putAssetCreate: async (asset) => {
      if (assets.has(asset.contentHash)) {
        return 'exists';
      }
      assets.set(asset.contentHash, asset);
      return 'created';
    },
  } as ConnectorCatalogStorage;
  return storage;
};
