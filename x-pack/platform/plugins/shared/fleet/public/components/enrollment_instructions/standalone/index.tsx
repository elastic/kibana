/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandsByPlatform } from '../../../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';
import type { DownloadSource, FleetProxy } from '../../../types';
import { getDownloadBaseUrl, getDownloadSourceProxyArgs } from '../manual';

export const StandaloneInstructions = ({
  agentVersion,
  downloadSource,
  downloadSourceProxy,
}: {
  agentVersion: string;
  downloadSource?: DownloadSource;
  downloadSourceProxy?: FleetProxy;
}): CommandsByPlatform => {
  const downloadBaseUrl = getDownloadBaseUrl(downloadSource);
  const { windows: windowsDownloadSourceProxyArgs, curl: curlDownloadSourceProxyArgs } =
    getDownloadSourceProxyArgs(downloadSourceProxy);

  const linuxDebAarch64Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-arm64.deb ${curlDownloadSourceProxyArgs}
sudo dpkg -i elastic-agent-${agentVersion}-arm64.deb \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxDebX8664Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-amd64.deb ${curlDownloadSourceProxyArgs}
sudo dpkg -i elastic-agent-${agentVersion}-amd64.deb \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmAarch64Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-aarch64.rpm ${curlDownloadSourceProxyArgs}
sudo rpm -vi elastic-agent-${agentVersion}-aarch64.rpm \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmX8664Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-x86_64.rpm ${curlDownloadSourceProxyArgs}
sudo rpm -vi elastic-agent-${agentVersion}-x86_64.rpm \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxAarch64Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-linux-arm64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf elastic-agent-${agentVersion}-linux-arm64.tar.gz
cd elastic-agent-${agentVersion}-linux-arm64
sudo ./elastic-agent install`;

  const linuxX8664Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-linux-x86_64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf elastic-agent-${agentVersion}-linux-x86_64.tar.gz
cd elastic-agent-${agentVersion}-linux-x86_64
sudo ./elastic-agent install`;

  const macAarch64Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-darwin-aarch64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf elastic-agent-${agentVersion}-darwin-aarch64.tar.gz
cd elastic-agent-${agentVersion}-darwin-aarch64
sudo ./elastic-agent install`;

  const macX8664Command = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-darwin-x86_64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf elastic-agent-${agentVersion}-darwin-x86_64.tar.gz
cd elastic-agent-${agentVersion}-darwin-x86_64
sudo ./elastic-agent install`;

  const windowsCommand = `$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri ${downloadBaseUrl}/beats/elastic-agent/elastic-agent-${agentVersion}-windows-x86_64.zip -OutFile elastic-agent-${agentVersion}-windows-x86_64.zip ${windowsDownloadSourceProxyArgs}
Expand-Archive .\elastic-agent-${agentVersion}-windows-x86_64.zip -DestinationPath .
cd elastic-agent-${agentVersion}-windows-x86_64
.\\elastic-agent.exe install`;

  const k8sCommand = 'kubectl apply -f elastic-agent-standalone-kubernetes.yml';

  return {
    linux_aarch64: linuxAarch64Command,
    linux_x86_64: linuxX8664Command,
    mac_aarch64: macAarch64Command,
    mac_x86_64: macX8664Command,
    windows: windowsCommand,
    deb_aarch64: linuxDebAarch64Command,
    deb_x86_64: linuxDebX8664Command,
    rpm_aarch64: linuxRpmAarch64Command,
    rpm_x86_64: linuxRpmX8664Command,
    kubernetes: k8sCommand,
  };
};
