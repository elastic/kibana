/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yauzl from 'yauzl';
import { parse as parseYaml } from 'yaml';

// Loaded lazily, same as Fleet does: the openpgp cjs build fails to load under jsdom.
const loadOpenpgp = () => import('openpgp');

export interface EprPackageVersion {
  name: string;
  version: string;
  download: string;
  signaturePath?: string;
  kibanaVersionCondition?: string;
}

export interface ConnectorSpecFile {
  path: string;
  connectorType: string;
  specVersion: string;
  yamlBytes: number;
  /** Raw YAML text, needed by the actions catalog loader. */
  yaml: string;
  spec: Record<string, unknown>;
}

interface EprSearchItem {
  name: string;
  version: string;
  download: string;
  signature_path?: string;
  conditions?: { kibana?: { version?: string } };
}

// Matches "<name>-<version>/connector_specs/<type>/<specVersion>.yaml",
// and the lint-clean variant under "img/connector_specs/".
const SPEC_PATH_REGEX = /^[^/]+\/(?:img\/)?connector_specs\/([^/]+)\/([^/]+)\.ya?ml$/;

const getOk = async (url: string, signal?: AbortSignal): Promise<Response> => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status}`);
  }
  return response;
};

/** Lists the versions of a package with a plain HTTP request to the EPR search API. */
export const listPackageVersions = async ({
  registryUrl,
  packageName,
  kibanaVersion,
  signal,
}: {
  registryUrl: string;
  packageName: string;
  kibanaVersion?: string;
  signal?: AbortSignal;
}): Promise<EprPackageVersion[]> => {
  const url = new URL(`${registryUrl}/search`);
  url.searchParams.set('package', packageName);
  url.searchParams.set('all', 'true');
  url.searchParams.set('prerelease', 'true');
  if (kibanaVersion) {
    url.searchParams.set('kibana.version', kibanaVersion);
  }
  const response = await getOk(url.toString(), signal);
  const items = (await response.json()) as EprSearchItem[];
  return items.map(({ name, version, download, signature_path: signaturePath, conditions }) => ({
    name,
    version,
    download,
    signaturePath,
    kibanaVersionCondition: conditions?.kibana?.version,
  }));
};

/** Downloads a file from the EPR as a Buffer. */
export const downloadBuffer = async (
  registryUrl: string,
  path: string,
  signal?: AbortSignal
): Promise<Buffer> => {
  const response = await getOk(`${registryUrl}${path}`, signal);
  return Buffer.from(await response.arrayBuffer());
};

/** Checks a detached armored OpenPGP signature of the zip bytes against a public key. */
export const verifyZipSignature = async ({
  zip,
  armoredSignature,
  armoredPublicKey,
}: {
  zip: Buffer;
  armoredSignature: string;
  armoredPublicKey: string;
}): Promise<{ verified: boolean; keyId: string; error?: string }> => {
  const openpgp = await loadOpenpgp();
  const verificationKeys = await openpgp.readKey({ armoredKey: armoredPublicKey });
  const signature = await openpgp.readSignature({ armoredSignature });
  const message = await openpgp.createMessage({ binary: zip });
  const { signatures } = await openpgp.verify({ message, signature, verificationKeys });
  const [first] = signatures;
  const keyId = first.keyID.toHex();
  try {
    await first.verified;
    return { verified: true, keyId };
  } catch (error) {
    return { verified: false, keyId, error: (error as Error).message };
  }
};

const readZipEntries = (zip: Buffer): Promise<Array<{ path: string; content: Buffer }>> =>
  new Promise((resolve, reject) => {
    yauzl.fromBuffer(zip, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error('Unable to open zip'));
        return;
      }
      const entries: Array<{ path: string; content: Buffer }> = [];
      zipFile.on('error', reject);
      zipFile.on('end', () => resolve(entries));
      zipFile.on('entry', (entry: yauzl.Entry) => {
        if (entry.fileName.endsWith('/')) {
          zipFile.readEntry();
          return;
        }
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            reject(streamError ?? new Error(`Unable to read ${entry.fileName}`));
            return;
          }
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => {
            entries.push({ path: entry.fileName, content: Buffer.concat(chunks) });
            zipFile.readEntry();
          });
        });
      });
      zipFile.readEntry();
    });
  });

/** Reads and parses every connector spec YAML inside a package zip. */
export const readConnectorSpecs = async (zip: Buffer): Promise<ConnectorSpecFile[]> => {
  const entries = await readZipEntries(zip);
  const specs: ConnectorSpecFile[] = [];
  for (const { path, content } of entries) {
    const match = SPEC_PATH_REGEX.exec(path);
    if (match) {
      const [, connectorType, specVersion] = match;
      const yaml = content.toString('utf8');
      specs.push({
        path,
        connectorType,
        specVersion,
        yamlBytes: content.length,
        yaml,
        spec: parseYaml(yaml) as Record<string, unknown>,
      });
    }
  }
  return specs;
};
