/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import Path from 'path';
import { promises as Fs } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { DATA_DIR, createDirIfNotExists, fileExists } from '../util/file_utils';

const CERTS_DIR = Path.join(DATA_DIR, 'certs');

const TLS_CERT_PATH = Path.join(CERTS_DIR, 'tls.crt');
const FULL_CHAIN_PATH = Path.join(CERTS_DIR, 'fullchain.crt');
const TLS_KEY_PATH = Path.join(CERTS_DIR, 'tls.key');

interface CertificateFiles {
  tls: {
    key: string;
    cert: string;
  };
  ca: {
    cert: string;
  };
}

async function ensureMkcert({ log }: { log: ToolingLog }) {
  const mkCertExists = await execa
    .command('which mkcert')
    .then(() => true)
    .catch(() => false);

  if (!mkCertExists) {
    const brewExists = await execa
      .command('which brew')
      .then(() => true)
      .catch(() => false);

    if (!brewExists) {
      throw new Error(`mkcert is not available and needed to install locally-trusted certificates`);
    }

    log.info('Installing mkcert');

    await execa.command(`brew install mkcert`);
  }

  await execa.command('mkcert -install');

  const caRoot = await execa.command(`mkcert -CAROOT`).then((val) => val.stdout);

  const caCertFilePath = `${caRoot}/rootCA.pem`;

  return {
    caCertFilePath,
  };
}

export async function generateCertificates({
  log,
}: {
  log: ToolingLog;
}): Promise<CertificateFiles> {
  const { caCertFilePath } = await ensureMkcert({ log });

  const allExists = (
    await Promise.all([fileExists(FULL_CHAIN_PATH), fileExists(TLS_KEY_PATH)])
  ).every(Boolean);

  if (!allExists) {
    log.info(`Generating certificates`);

    await createDirIfNotExists(CERTS_DIR);

    await execa.command(`mkcert -cert-file=${TLS_CERT_PATH} -key-file=${TLS_KEY_PATH} localhost`);
  }

  const allFileContents = await Promise.all([
    Fs.readFile(TLS_CERT_PATH, 'utf8'),
    Fs.readFile(caCertFilePath, 'utf8'),
  ]);

  await Fs.writeFile(FULL_CHAIN_PATH, allFileContents.join('\n'));

  return {
    tls: {
      cert: FULL_CHAIN_PATH,
      key: TLS_KEY_PATH,
    },
    ca: {
      cert: caCertFilePath,
    },
  };
}
