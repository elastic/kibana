/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Path from 'path';
import fs from 'fs/promises';
import os from 'os';
import chalk from 'chalk';
import { assertDockerAvailable } from '../util/assert_docker_available';

async function assertVaultAvailable(log: ToolingLog) {
  log.debug('Checking if vault is available');

  try {
    await execa.command('which vault');
  } catch (error) {
    throw new Error(
      'Vault is not available. Please install vault: https://docs.elastic.dev/vault',
      { cause: error }
    );
  }

  try {
    await execa.command('vault status', { timeout: 2500 });
  } catch (error) {
    if ((error as any).timedOut) {
      throw new Error(
        'Vault timed out. Make sure you are connected to the VPN if needed: https://docs.elastic.dev/vault',
        { cause: error }
      );
    }
    throw new Error('Could not connect to vault. Please login: vault login -method=okta', {
      cause: error,
    });
  }

  log.debug('Vault is available');
}

async function getAwsCredentials(log: ToolingLog): Promise<{
  AWS_BEDROCK_AWS_ACCESS_KEY_ID: string;
  AWS_BEDROCK_AWS_SECRET_ACCESS_KEY: string;
}> {
  log.debug('Fetching AWS credentials from vault');

  const secretPath =
    process.env.VAULT_SECRET_PATH || 'secret/ent-search-team/inference/eis-gateway/dev';
  const vaultAddress = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';

  try {
    const { stdout: accessKeyId } = await execa.command(
      `vault read -field bedrock-aws-access-key-id ${secretPath}`,
      { env: { VAULT_ADDR: vaultAddress } }
    );
    const { stdout: secretAccessKey } = await execa.command(
      `vault read -field bedrock-aws-secret-access-key ${secretPath}`,
      { env: { VAULT_ADDR: vaultAddress } }
    );

    return {
      AWS_BEDROCK_AWS_ACCESS_KEY_ID: accessKeyId.trim(),
      AWS_BEDROCK_AWS_SECRET_ACCESS_KEY: secretAccessKey.trim(),
    };
  } catch (error) {
    throw new Error('Failed to read AWS credentials from vault', { cause: error });
  }
}

async function cloneEisGateway(log: ToolingLog): Promise<string> {
  const tmpDir = await fs.mkdtemp(Path.join(os.tmpdir(), 'eis-gateway-'));
  log.debug(`Cloning eis-gateway to ${tmpDir}`);

  try {
    await execa.command('git clone --depth 1 git@github.com:elastic/eis-gateway.git .', {
      cwd: tmpDir,
    });
  } catch (error) {
    // Try HTTPS if SSH fails
    log.debug('SSH clone failed, trying HTTPS');
    await execa.command('git clone --depth 1 https://github.com/elastic/eis-gateway.git .', {
      cwd: tmpDir,
    });
  }

  return tmpDir;
}

async function generateFakeCerts(eisDir: string, log: ToolingLog) {
  log.debug('Generating fake certificates');

  const certsDir = Path.join(eisDir, 'certs');
  const certsTlsDir = Path.join(certsDir, 'tls');
  const certsCaDir = Path.join(certsDir, 'ca');

  await fs.mkdir(certsTlsDir, { recursive: true });
  await fs.mkdir(certsCaDir, { recursive: true });

  // Generate a self-signed certificate using openssl
  const commands = [
    // Generate CA key
    `openssl ecparam -name prime256v1 -genkey -noout -out ${certsCaDir}/ca.key`,
    // Generate CA certificate
    `openssl req -new -x509 -key ${certsCaDir}/ca.key -out ${certsCaDir}/ca.crt -days 365 -subj '/CN=EIS Local CA'`,
    // Generate server key
    `openssl ecparam -name prime256v1 -genkey -noout -out ${certsTlsDir}/tls.key`,
    // Generate certificate signing request
    `openssl req -new -key ${certsTlsDir}/tls.key -out ${certsTlsDir}/tls.csr -subj '/CN=localhost'`,
    // Sign the certificate
    `openssl x509 -req -in ${certsTlsDir}/tls.csr -CA ${certsCaDir}/ca.crt -CAkey ${certsCaDir}/ca.key -out ${certsTlsDir}/tls.crt -days 365 -sha512 -CAcreateserial -extfile <(echo 'authorityKeyIdentifier=keyid,issuer'; echo 'basicConstraints=CA:FALSE'; echo 'subjectAltName = critical, DNS:localhost')`,
  ];

  for (const cmd of commands) {
    await execa.command(cmd, { shell: '/bin/bash' });
  }

  // Create combined PEM file
  const cert = await fs.readFile(`${certsTlsDir}/tls.crt`, 'utf-8');
  const key = await fs.readFile(`${certsTlsDir}/tls.key`, 'utf-8');
  await fs.writeFile(`${certsTlsDir}/tls.pem`, cert + key);

  log.debug('Certificates generated');
}

export async function ensureEis({
  log,
  signal,
  onDirCreated,
}: {
  log: ToolingLog;
  signal: AbortSignal;
  onDirCreated?: (dir: string) => void;
}) {
  log.info('Ensuring EIS is available');

  await assertDockerAvailable();
  await assertVaultAvailable(log);

  const credentials = await getAwsCredentials(log);

  // Clone eis-gateway repo
  const eisDir = await cloneEisGateway(log);
  log.info(`EIS Gateway cloned to ${eisDir}`);

  // Notify caller of the directory so they can register cleanup
  if (onDirCreated) {
    onDirCreated(eisDir);
  }

  // Generate certificates
  await generateFakeCerts(eisDir, log);

  log.write('');
  log.write(
    `${chalk.green(
      '✔'
    )} EIS Gateway ready. Start Elasticsearch with "-E xpack.inference.elastic.url=https://localhost:8443 -E xpack.inference.elastic.http.ssl.verification_mode=none -E xpack.inference.elastic.ccm_supported_environment=false" to connect`
  );
  log.write('');
  log.write('');
  log.info('Starting EIS Gateway...');

  // Run make run (runs the Go binary directly)
  const makeProcess = execa.command(
    'make ENTITLEMENTS_SKIP_CHECK=true TLS_CLIENT_AUTH=NoClientCert run',
    {
      cwd: eisDir,
      stdio: 'inherit',
      env: {
        ...credentials,
        PATH: process.env.PATH,
      },
    }
  );

  // Handle abort signal to kill the process
  const abortHandler = () => {
    makeProcess.kill('SIGTERM');
  };
  signal.addEventListener('abort', abortHandler);

  try {
    await makeProcess;
  } finally {
    signal.removeEventListener('abort', abortHandler);
  }
}
