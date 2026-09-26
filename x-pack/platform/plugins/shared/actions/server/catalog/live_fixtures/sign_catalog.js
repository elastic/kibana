#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Regenerates catalog.json content hashes, catalogVersion, and catalog.json.sig
 * using the PoC dev Ed25519 key. Run from this directory:
 *   node sign_catalog.js
 */

const fs = require('fs');
const path = require('path');
const { createHash, sign } = require('crypto');

const root = __dirname;
const keyPath = path.join(
  root,
  '..',
  '__fixtures__',
  'dev_signing_key',
  'catalog_dev_private_key.pem'
);

const hash = (raw) => `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const rows = [
  { id: '.abuseipdb', version: '1.1', definitionUrl: 'connectors/abuseipdb/1.1.yaml' },
  { id: '.abuseipdb', version: '1.0', definitionUrl: 'connectors/abuseipdb/1.0.yaml' },
  { id: '.okta', version: '1.0', definitionUrl: 'connectors/okta/1.0.yaml' },
].map((row) => ({ ...row, contentHash: hash(read(row.definitionUrl)) }));

const abuseIcon =
  'connectors/abuseipdb/icons/sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012.svg';
const oktaIcon =
  'connectors/okta/icons/sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84.svg';

const manifest = {
  schemaVersion: 1,
  catalogVersion: '',
  sequence: 1,
  typeMetadata: {
    '.abuseipdb': {
      displayName: 'AbuseIPDB (Declarative PoC)',
      description: 'IP reputation checking with optional verbose reports and abuse reporting',
      icon: { path: abuseIcon, contentHash: hash(read(abuseIcon)) },
      minimumLicense: 'gold',
      isTechnicalPreview: true,
      supportedFeatureIds: ['workflows', 'agentBuilder'],
    },
    '.okta': {
      displayName: 'Okta (Declarative PoC)',
      description:
        'Read-only Okta users and System Log actions from a catalog-loaded YAML definition',
      icon: { path: oktaIcon, contentHash: hash(read(oktaIcon)) },
      minimumLicense: 'enterprise',
      isTechnicalPreview: true,
      supportedFeatureIds: ['workflows', 'agentBuilder'],
    },
  },
  connectors: rows,
};
manifest.catalogVersion = hash(JSON.stringify({ ...manifest, catalogVersion: '' }));

const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(path.join(root, 'catalog.json'), bytes);
const signature = sign(null, Buffer.from(bytes, 'utf8'), fs.readFileSync(keyPath, 'utf8')).toString(
  'base64'
);
fs.writeFileSync(path.join(root, 'catalog.json.sig'), `${signature}\n`);
process.stdout.write(
  `Signed catalog.json sequence=${manifest.sequence} ${manifest.catalogVersion}\n`
);
