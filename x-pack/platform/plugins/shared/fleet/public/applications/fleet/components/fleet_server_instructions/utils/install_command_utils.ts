/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadSource, FleetProxy } from '../../../../../../common/types';
import {
  getDownloadBaseUrl,
  getDownloadSourceProxyArgs,
} from '../../../../../components/enrollment_instructions/manual';
import type { PLATFORM_TYPE } from '../../../hooks';

export type CommandsByPlatform = {
  [key in PLATFORM_TYPE]: string;
};

function getArtifact(
  platform: PLATFORM_TYPE,
  kibanaVersion: string,
  downloadSource?: DownloadSource,
  downloadSourceProxy?: FleetProxy
) {
  const ARTIFACT_BASE_URL = `${getDownloadBaseUrl(downloadSource)}/beats/elastic-agent`;
  const { windows: windowsDownloadSourceProxyArgs, curl: curlDownloadSourceProxyArgs } =
    getDownloadSourceProxyArgs(downloadSourceProxy);

  const appendWindowsDownloadSourceProxyArgs = windowsDownloadSourceProxyArgs
    ? ` ${windowsDownloadSourceProxyArgs}`
    : '';
  const appendCurlDownloadSourceProxyArgs = curlDownloadSourceProxyArgs
    ? ` ${curlDownloadSourceProxyArgs}`
    : '';

  const artifactMap: Record<PLATFORM_TYPE, { downloadCommand: string }> = {
    linux_aarch64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-linux-arm64.tar.gz${appendCurlDownloadSourceProxyArgs}`,
        `tar xzvf elastic-agent-${kibanaVersion}-linux-arm64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-linux-arm64`,
      ].join(`\n`),
    },
    linux_x86_64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz${appendCurlDownloadSourceProxyArgs}`,
        `tar xzvf elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-linux-x86_64`,
      ].join(`\n`),
    },
    mac_aarch64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-aarch64.tar.gz${appendCurlDownloadSourceProxyArgs}`,
        `tar xzvf elastic-agent-${kibanaVersion}-darwin-aarch64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-darwin-aarch64`,
      ].join(`\n`),
    },
    mac_x86_64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz${appendCurlDownloadSourceProxyArgs}`,
        `tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-darwin-x86_64`,
      ].join(`\n`),
    },
    windows: {
      downloadCommand: [
        `$ProgressPreference = 'SilentlyContinue'`,
        `Invoke-WebRequest -Uri ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-windows-x86_64.zip -OutFile elastic-agent-${kibanaVersion}-windows-x86_64.zip${appendWindowsDownloadSourceProxyArgs}`,
        `Expand-Archive .\\elastic-agent-${kibanaVersion}-windows-x86_64.zip`,
        `cd elastic-agent-${kibanaVersion}-windows-x86_64`,
      ].join(`\n`),
    },
    deb_aarch64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-arm64.deb${appendCurlDownloadSourceProxyArgs}`,
        `sudo dpkg -i elastic-agent-${kibanaVersion}-arm64.deb`,
      ].join(`\n`),
    },
    deb_x86_64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-amd64.deb${appendCurlDownloadSourceProxyArgs}`,
        `sudo dpkg -i elastic-agent-${kibanaVersion}-amd64.deb`,
      ].join(`\n`),
    },
    rpm_aarch64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-aarch64.rpm${appendCurlDownloadSourceProxyArgs}`,
        `sudo rpm -vi elastic-agent-${kibanaVersion}-aarch64.rpm`,
      ].join(`\n`),
    },
    rpm_x86_64: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-x86_64.rpm${appendCurlDownloadSourceProxyArgs}`,
        `sudo rpm -vi elastic-agent-${kibanaVersion}-x86_64.rpm`,
      ].join(`\n`),
    },
    kubernetes: {
      downloadCommand: '',
    },
  };

  return artifactMap[platform];
}

export function getInstallCommandForPlatform({
  platform,
  esOutputHost,
  esOutputProxy,
  serviceToken,
  policyId,
  fleetServerHost,
  isProductionDeployment,
  sslCATrustedFingerprint,
  kibanaVersion,
  downloadSource,
  downloadSourceProxy,
}: {
  platform: PLATFORM_TYPE;
  esOutputHost: string;
  esOutputProxy?: FleetProxy | undefined;
  serviceToken: string;
  policyId?: string;
  fleetServerHost?: string;
  isProductionDeployment?: boolean;
  sslCATrustedFingerprint?: string;
  kibanaVersion?: string;
  downloadSource?: DownloadSource;
  downloadSourceProxy?: FleetProxy;
}): string {
  const newLineSeparator = platform === 'windows' ? '`\n' : '\\\n';

  const artifact = getArtifact(platform, kibanaVersion ?? '', downloadSource, downloadSourceProxy);

  const commandArguments = [];

  if (isProductionDeployment && fleetServerHost) {
    commandArguments.push(['url', fleetServerHost]);
  }

  commandArguments.push(['fleet-server-es', esOutputHost]);
  commandArguments.push(['fleet-server-service-token', serviceToken]);
  if (policyId) {
    commandArguments.push(['fleet-server-policy', policyId]);
  }

  if (sslCATrustedFingerprint) {
    commandArguments.push(['fleet-server-es-ca-trusted-fingerprint', sslCATrustedFingerprint]);
  }

  if (isProductionDeployment) {
    commandArguments.push(['certificate-authorities', '<PATH_TO_CA>']);
    if (!sslCATrustedFingerprint) {
      commandArguments.push(['fleet-server-es-ca', '<PATH_TO_ES_CERT>']);
    }
    commandArguments.push(['fleet-server-cert', '<PATH_TO_FLEET_SERVER_CERT>']);
    commandArguments.push(['fleet-server-cert-key', '<PATH_TO_FLEET_SERVER_CERT_KEY>']);
  }

  commandArguments.push(['fleet-server-port', '8220']);

  const enrollmentProxyArgs = [];
  if (esOutputProxy) {
    enrollmentProxyArgs.push(['proxy-url', esOutputProxy.url]);
    Object.entries(esOutputProxy.proxy_headers || []).forEach(([key, value]) => {
      enrollmentProxyArgs.push(['proxy-header', `"${key}=${value}"`]);
    });
  }

  const commandArgumentsStr = [...commandArguments, ...enrollmentProxyArgs]
    .reduce((acc, [key, val]) => {
      if (acc === '' && key === 'url') {
        return `--${key}=${val}`;
      }
      const valOrEmpty = val ? `=${val}` : '';
      return (acc += ` ${newLineSeparator}  --${key}${valOrEmpty}`);
    }, '')
    .trim();

  const commands = {
    linux_aarch64: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    linux_x86_64: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    mac_aarch64: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    mac_x86_64: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    windows: `${artifact.downloadCommand}\n.\\elastic-agent.exe install ${commandArgumentsStr}`,
    deb_aarch64: `${artifact.downloadCommand}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent\nsudo elastic-agent enroll ${commandArgumentsStr}`,
    deb_x86_64: `${artifact.downloadCommand}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent\nsudo elastic-agent enroll ${commandArgumentsStr}`,
    rpm_aarch64: `${artifact.downloadCommand}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent\nsudo elastic-agent enroll ${commandArgumentsStr}`,
    rpm_x86_64: `${artifact.downloadCommand}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent\nsudo elastic-agent enroll ${commandArgumentsStr}`,
    kubernetes: '',
    cloudFormation: '',
    googleCloudShell: '',
  };

  return commands[platform];
}
