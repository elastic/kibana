/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogSource, StoredCatalogDefinition } from '@kbn/actions-plugin/server';
import type { ConnectorCatalogEprConfig } from './config';
import {
  downloadBuffer,
  listPackageVersions,
  readConnectorSpecs,
  verifyZipSignature,
} from './epr_client';
import type { ConnectorSpecFile } from './epr_client';

const ERROR_PREFIX = 'EPR connector catalog:';

export interface EprCatalogSourceDeps {
  config: Pick<ConnectorCatalogEprConfig, 'registryUrl' | 'packageName' | 'publicKeyPath'>;
  kibanaVersion: string;
  logger: Logger;
  /** Reads the armored public key. Defaults to a UTF-8 file read. */
  readPublicKey?: (path: string) => Promise<string>;
}

interface LoadedPackage {
  version: string;
  specs: ConnectorSpecFile[];
}

const getSpecKey = ({ id, version }: { id: string; version: string }) => `${id}@${version}`;

const getSpecRef = ({ spec }: ConnectorSpecFile): { id: string; version: string } | undefined => {
  const { id, version } = spec;
  return typeof id === 'string' && typeof version === 'string' ? { id, version } : undefined;
};

const toDefinition = (file: ConnectorSpecFile, catalogVersion: string): StoredCatalogDefinition => {
  const ref = getSpecRef(file);
  return {
    connectorId: ref?.id ?? '',
    version: ref?.version ?? '',
    yaml: file.yaml,
    contentHash: `sha256:${createHash('sha256').update(file.yaml).digest('hex')}`,
    catalogVersion,
  };
};

/** Fetches, verifies, and parses the latest compatible package once. Fits the actions catalog loader. */
export const createEprCatalogSource = ({
  config,
  kibanaVersion,
  logger,
  readPublicKey = (path) => readFile(path, 'utf8'),
}: EprCatalogSourceDeps): ConnectorCatalogSource => {
  const { registryUrl, packageName, publicKeyPath } = config;

  const fetchPackage = async (signal?: AbortSignal): Promise<LoadedPackage> => {
    const versions = await listPackageVersions({ registryUrl, packageName, kibanaVersion, signal });
    const selected = versions[versions.length - 1];
    if (!selected) {
      throw new Error(
        `${ERROR_PREFIX} no version of ${packageName} on ${registryUrl} matches Kibana ${kibanaVersion}`
      );
    }
    if (!publicKeyPath) {
      throw new Error(`${ERROR_PREFIX} no publicKeyPath configured, signature cannot be checked`);
    }
    if (!selected.signaturePath) {
      throw new Error(`${ERROR_PREFIX} version ${selected.version} has no signature file`);
    }

    const zip = await downloadBuffer(registryUrl, selected.download, signal);
    const armoredSignature = (
      await downloadBuffer(registryUrl, selected.signaturePath, signal)
    ).toString('utf8');
    const armoredPublicKey = await readPublicKey(publicKeyPath);
    const signature = await verifyZipSignature({ zip, armoredSignature, armoredPublicKey });
    if (!signature.verified) {
      throw new Error(
        `${ERROR_PREFIX} signature check failed for ${packageName}-${selected.version}: ${signature.error}`
      );
    }

    const specs = await readConnectorSpecs(zip);
    logger.info(
      `Loaded ${packageName}-${selected.version} from ${registryUrl}: ${specs.length} spec file(s), signature key ${signature.keyId}`
    );
    return { version: selected.version, specs };
  };

  let loaded: Promise<LoadedPackage> | undefined;

  // The first call starts the load. Later calls share it. A failed load is not kept.
  const loadPackage = (signal?: AbortSignal): Promise<LoadedPackage> => {
    if (!loaded) {
      const attempt = fetchPackage(signal).catch((error: Error) => {
        loaded = undefined;
        throw error.message.startsWith(ERROR_PREFIX)
          ? error
          : new Error(
              `${ERROR_PREFIX} ${error.message} (registry ${registryUrl}, package ${packageName})`
            );
      });
      loaded = attempt;
    }
    return loaded;
  };

  return {
    getManifest: async (options) => {
      const { specs } = await loadPackage(options?.signal);
      const connectors = specs.flatMap((file) => {
        const ref = getSpecRef(file);
        return ref ? [ref] : [];
      });
      return { raw: JSON.stringify({ connectors }) };
    },
    getDefinitions: async (refs, options) => {
      const { version, specs } = await loadPackage(options?.signal);
      const wanted = new Set(refs.map(getSpecKey));
      return specs
        .filter((file) => {
          const ref = getSpecRef(file);
          return ref !== undefined && wanted.has(getSpecKey(ref));
        })
        .map((file) => toDefinition(file, version));
    },
  };
};
