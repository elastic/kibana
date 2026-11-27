/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  downloadBuffer,
  listPackageVersions,
  readConnectorSpecs,
  verifyZipSignature,
} from './epr_client';

// Runs against a live local EPR. Set EPR_URL, for example:
//   EPR_URL=http://localhost:8080 node scripts/jest x-pack/platform/plugins/shared/connector_catalog_epr
const registryUrl = process.env.EPR_URL;
const packageName = process.env.EPR_PACKAGE ?? 'kibana_connector_specs';
const describeWithEpr = registryUrl ? describe : describe.skip;

const KEY_DIR = resolve(
  REPO_ROOT,
  'x-pack/platform/test/fleet_api_integration/apis/fixtures/package_verification/signatures'
);
const armoredPublicKey = readFileSync(resolve(KEY_DIR, 'fleet_test_key_public.asc'), 'utf8');

describeWithEpr('EPR client without Fleet (live EPR)', () => {
  const url = registryUrl as string;

  it('lists every version of the package', async () => {
    const versions = await listPackageVersions({ registryUrl: url, packageName });
    expect(versions.map(({ version }) => version)).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    expect(versions[0].download).toBe(
      '/epr/kibana_connector_specs/kibana_connector_specs-1.0.0.zip'
    );
    expect(versions[0].signaturePath).toBe(
      '/epr/kibana_connector_specs/kibana_connector_specs-1.0.0.zip.sig'
    );
  });

  it('hides the version that needs a newer Kibana when kibana.version is sent', async () => {
    const versions = await listPackageVersions({
      registryUrl: url,
      packageName,
      kibanaVersion: '9.7.0',
    });
    expect(versions.map(({ version }) => version)).toEqual(['1.0.0', '1.1.0']);
  });

  it('downloads the older version 1.0.0 and reads the YAML inside it', async () => {
    const zip = await downloadBuffer(
      url,
      '/epr/kibana_connector_specs/kibana_connector_specs-1.0.0.zip'
    );
    const specs = await readConnectorSpecs(zip);
    expect(specs.map(({ path }) => path)).toEqual([
      'kibana_connector_specs-1.0.0/connector_specs/alienvault/1.0.yaml',
    ]);
    expect(specs[0].spec).toMatchObject({ id: '.alienvault', version: '1.0' });
    expect(specs[0].yaml).toContain('id: .alienvault');
  });

  it('downloads version 1.1.0 and finds both spec versions, with 1.0 unchanged', async () => {
    const oldZip = await downloadBuffer(
      url,
      '/epr/kibana_connector_specs/kibana_connector_specs-1.0.0.zip'
    );
    const newZip = await downloadBuffer(
      url,
      '/epr/kibana_connector_specs/kibana_connector_specs-1.1.0.zip'
    );
    const [oldSpec] = await readConnectorSpecs(oldZip);
    const newSpecs = await readConnectorSpecs(newZip);
    expect(
      newSpecs.map(({ connectorType, specVersion }) => `${connectorType}@${specVersion}`)
    ).toEqual(['alienvault@1.0', 'alienvault@1.1']);
    expect(newSpecs[0].spec).toEqual(oldSpec.spec);
    expect(Object.keys(newSpecs[1].spec.actions as object)).toEqual(['getIndicator', 'getPulse']);
  });

  describe('signature', () => {
    let zip: Buffer;
    let armoredSignature: string;

    beforeAll(async () => {
      const versions = await listPackageVersions({ registryUrl: url, packageName });
      const selected = versions.find(({ version }) => version === '1.1.0');
      zip = await downloadBuffer(url, selected?.download ?? '');
      armoredSignature = (await downloadBuffer(url, selected?.signaturePath ?? '')).toString(
        'utf8'
      );
    });

    it('serves an armored detached signature for the zip', () => {
      expect(armoredSignature).toContain('-----BEGIN PGP SIGNATURE-----');
    });

    it('passes with the real zip', async () => {
      const result = await verifyZipSignature({ zip, armoredSignature, armoredPublicKey });
      expect(result.verified).toBe(true);
    });

    it('fails when 1 byte of the zip is changed', async () => {
      const changed = Buffer.from(zip);
      const middle = Math.floor(changed.length / 2);
      changed.writeUInt8((changed.readUInt8(middle) + 1) % 256, middle);
      const result = await verifyZipSignature({ zip: changed, armoredSignature, armoredPublicKey });
      expect(result.verified).toBe(false);
      expect(result.error).toMatch(/digest|signature/i);
    });

    it('fails when the signature of another version is used', async () => {
      const otherSignature = (
        await downloadBuffer(
          url,
          '/epr/kibana_connector_specs/kibana_connector_specs-1.0.0.zip.sig'
        )
      ).toString('utf8');
      const result = await verifyZipSignature({
        zip,
        armoredSignature: otherSignature,
        armoredPublicKey,
      });
      expect(result.verified).toBe(false);
    });
  });
});

// Optional check against production EPR with the Elastic key that Kibana builds ship.
//   EPR_PROD_KEY=/path/to/GPG-KEY-elasticsearch node scripts/jest x-pack/platform/plugins/shared/connector_catalog_epr
const prodKeyPath = process.env.EPR_PROD_KEY;
const describeWithProd = prodKeyPath ? describe : describe.skip;

describeWithProd('production EPR signature with the Elastic key (live)', () => {
  const prodUrl = 'https://epr.elastic.co';
  const prodPackage = process.env.EPR_PROD_PACKAGE ?? 'barracuda';

  it('verifies a production zip, and fails with a changed byte', async () => {
    const prodKey = readFileSync(prodKeyPath as string, 'utf8');
    const versions = await listPackageVersions({ registryUrl: prodUrl, packageName: prodPackage });
    const latest = versions[versions.length - 1];
    const zip = await downloadBuffer(prodUrl, latest.download);
    const armoredSignature = (await downloadBuffer(prodUrl, latest.signaturePath ?? '')).toString(
      'utf8'
    );
    const good = await verifyZipSignature({ zip, armoredSignature, armoredPublicKey: prodKey });
    process.stdout.write(
      `prod check: ${latest.name}-${latest.version}, ${zip.length} bytes, keyId ${good.keyId}, verified ${good.verified}\n`
    );
    expect(good.verified).toBe(true);

    const changed = Buffer.from(zip);
    changed.writeUInt8((changed.readUInt8(100) + 1) % 256, 100);
    const bad = await verifyZipSignature({
      zip: changed,
      armoredSignature,
      armoredPublicKey: prodKey,
    });
    expect(bad.verified).toBe(false);
  });
});
