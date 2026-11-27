/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createEprCatalogSource } from './catalog_source';
import {
  downloadBuffer,
  listPackageVersions,
  readConnectorSpecs,
  verifyZipSignature,
} from './epr_client';

jest.mock('./epr_client');

const listPackageVersionsMock = jest.mocked(listPackageVersions);
const downloadBufferMock = jest.mocked(downloadBuffer);
const readConnectorSpecsMock = jest.mocked(readConnectorSpecs);
const verifyZipSignatureMock = jest.mocked(verifyZipSignature);

const REGISTRY_URL = 'http://epr.test';
const YAML = 'schemaVersion: 1\nid: .abuseipdb-epr\nversion: 1.1.0\n';
const VERSION = {
  name: 'kibana_connector_specs',
  version: '1.3.0',
  download: '/epr/kibana_connector_specs/kibana_connector_specs-1.3.0.zip',
  signaturePath: '/epr/kibana_connector_specs/kibana_connector_specs-1.3.0.zip.sig',
};
const SPEC_FILE = {
  path: 'kibana_connector_specs-1.3.0/connector_specs/abuseipdb/1.1.0.yaml',
  connectorType: 'abuseipdb',
  specVersion: '1.1.0',
  yamlBytes: YAML.length,
  yaml: YAML,
  spec: { id: '.abuseipdb-epr', version: '1.1.0' },
};

describe('createEprCatalogSource', () => {
  const logger = loggingSystemMock.createLogger();
  const readPublicKey = jest.fn();

  const createSource = ({ withKey = true }: { withKey?: boolean } = {}) =>
    createEprCatalogSource({
      config: {
        registryUrl: REGISTRY_URL,
        packageName: 'kibana_connector_specs',
        publicKeyPath: withKey ? '/keys/public.asc' : undefined,
      },
      kibanaVersion: '9.7.0',
      logger,
      readPublicKey,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    listPackageVersionsMock.mockResolvedValue([{ ...VERSION, version: '1.1.0' }, VERSION]);
    downloadBufferMock.mockResolvedValue(Buffer.from('content'));
    readPublicKey.mockResolvedValue('armored-public-key');
    verifyZipSignatureMock.mockResolvedValue({ verified: true, keyId: 'ABCD' });
    readConnectorSpecsMock.mockResolvedValue([SPEC_FILE]);
  });

  it('returns 1 manifest row and 1 definition with the raw YAML', async () => {
    const source = createSource();

    const manifest = await source.getManifest();
    expect(JSON.parse(manifest?.raw ?? '')).toEqual({
      connectors: [{ id: '.abuseipdb-epr', version: '1.1.0' }],
    });

    const definitions = await source.getDefinitions([{ id: '.abuseipdb-epr', version: '1.1.0' }]);
    expect(definitions).toEqual([
      {
        connectorId: '.abuseipdb-epr',
        version: '1.1.0',
        yaml: YAML,
        contentHash: `sha256:${createHash('sha256').update(YAML).digest('hex')}`,
        catalogVersion: '1.3.0',
      },
    ]);
  });

  it('uses the latest version and sends the Kibana version', async () => {
    await createSource().getManifest();

    expect(listPackageVersionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        registryUrl: REGISTRY_URL,
        packageName: 'kibana_connector_specs',
        kibanaVersion: '9.7.0',
      })
    );
    expect(downloadBufferMock).toHaveBeenCalledWith(REGISTRY_URL, VERSION.download, undefined);
    expect(downloadBufferMock).toHaveBeenCalledWith(REGISTRY_URL, VERSION.signaturePath, undefined);
    expect(verifyZipSignatureMock).toHaveBeenCalledWith(
      expect.objectContaining({ armoredPublicKey: 'armored-public-key' })
    );
  });

  it('loads the package once for the manifest and the definitions', async () => {
    const source = createSource();

    await source.getManifest();
    await source.getDefinitions([{ id: '.abuseipdb-epr', version: '1.1.0' }]);

    expect(listPackageVersionsMock).toHaveBeenCalledTimes(1);
    expect(readConnectorSpecsMock).toHaveBeenCalledTimes(1);
  });

  it('passes the abort signal to the EPR calls', async () => {
    const { signal } = new AbortController();

    await createSource().getManifest({ signal });

    expect(listPackageVersionsMock).toHaveBeenCalledWith(expect.objectContaining({ signal }));
    expect(downloadBufferMock).toHaveBeenCalledWith(REGISTRY_URL, VERSION.download, signal);
  });

  it('throws when no version matches the Kibana version', async () => {
    listPackageVersionsMock.mockResolvedValue([]);

    await expect(createSource().getManifest()).rejects.toThrow(
      `EPR connector catalog: no version of kibana_connector_specs on ${REGISTRY_URL} matches Kibana 9.7.0`
    );
  });

  it('throws without a public key path, and downloads nothing', async () => {
    await expect(createSource({ withKey: false }).getManifest()).rejects.toThrow(
      'EPR connector catalog: no publicKeyPath configured, signature cannot be checked'
    );
    expect(downloadBufferMock).not.toHaveBeenCalled();
  });

  it('throws when the version has no signature file', async () => {
    listPackageVersionsMock.mockResolvedValue([{ ...VERSION, signaturePath: undefined }]);

    await expect(createSource().getManifest()).rejects.toThrow(
      'EPR connector catalog: version 1.3.0 has no signature file'
    );
    expect(downloadBufferMock).not.toHaveBeenCalled();
  });

  it('throws with the reason when the signature does not verify', async () => {
    verifyZipSignatureMock.mockResolvedValue({
      verified: false,
      keyId: 'ABCD',
      error: 'Signature digest mismatch',
    });

    await expect(createSource().getManifest()).rejects.toThrow(
      'EPR connector catalog: signature check failed for kibana_connector_specs-1.3.0: Signature digest mismatch'
    );
    expect(readConnectorSpecsMock).not.toHaveBeenCalled();
  });

  it('rethrows an EPR failure with the prefix and the registry URL', async () => {
    listPackageVersionsMock.mockRejectedValue(new Error('fetch failed'));

    await expect(createSource().getManifest()).rejects.toThrow(
      `EPR connector catalog: fetch failed (registry ${REGISTRY_URL}, package kibana_connector_specs)`
    );
  });

  it('retries after a failed load', async () => {
    listPackageVersionsMock.mockRejectedValueOnce(new Error('fetch failed'));
    const source = createSource();

    await expect(source.getManifest()).rejects.toThrow('EPR connector catalog:');
    await expect(source.getManifest()).resolves.toBeDefined();
  });

  it('ignores refs without a matching file', async () => {
    const definitions = await createSource().getDefinitions([
      { id: '.other', version: '1.0.0' },
      { id: '.abuseipdb-epr', version: '9.9.9' },
    ]);

    expect(definitions).toEqual([]);
  });

  it('leaves files without a string id or version out of the manifest', async () => {
    readConnectorSpecsMock.mockResolvedValue([
      SPEC_FILE,
      { ...SPEC_FILE, path: 'a', spec: { id: 5, version: '1.0.0' } },
      { ...SPEC_FILE, path: 'b', spec: { id: '.x', version: 1 } },
    ]);

    const manifest = await createSource().getManifest();

    expect(JSON.parse(manifest?.raw ?? '').connectors).toEqual([
      { id: '.abuseipdb-epr', version: '1.1.0' },
    ]);
  });
});
