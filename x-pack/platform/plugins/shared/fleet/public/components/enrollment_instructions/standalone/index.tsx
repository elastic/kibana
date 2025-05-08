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
  showCompleteAgentInstructions,
}: {
  agentVersion: string;
  downloadSource?: DownloadSource;
  downloadSourceProxy?: FleetProxy;
  showCompleteAgentInstructions: boolean;
}): CommandsByPlatform => {
  const elasticAgentName = showCompleteAgentInstructions
    ? 'elastic-agent-complete'
    : 'elastic-agent';

  const downloadBaseUrl = getDownloadBaseUrl(downloadSource);
  const { windows: windowsDownloadSourceProxyArgs, curl: curlDownloadSourceProxyArgs } =
    getDownloadSourceProxyArgs(downloadSourceProxy);

  const linuxDebCommand = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/${elasticAgentName}-${agentVersion}-amd64.deb ${curlDownloadSourceProxyArgs}
sudo dpkg -i ${elasticAgentName}-${agentVersion}-amd64.deb \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmCommand = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/${elasticAgentName}-${agentVersion}-x86_64.rpm ${curlDownloadSourceProxyArgs}
sudo rpm -vi ${elasticAgentName}-${agentVersion}-x86_64.rpm \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxCommand = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/${elasticAgentName}-${agentVersion}-linux-x86_64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf ${elasticAgentName}-${agentVersion}-linux-x86_64.tar.gz
cd ${elasticAgentName}-${agentVersion}-linux-x86_64
sudo ./elastic-agent install`;

  const macCommand = `curl -L -O ${downloadBaseUrl}/beats/elastic-agent/${elasticAgentName}-${agentVersion}-darwin-aarch64.tar.gz ${curlDownloadSourceProxyArgs}
tar xzvf ${elasticAgentName}-${agentVersion}-darwin-aarch64.tar.gz
cd ${elasticAgentName}-${agentVersion}-darwin-aarch64
sudo ./elastic-agent install`;

  const windowsCommand = `$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri ${downloadBaseUrl}/beats/elastic-agent/${elasticAgentName}-${agentVersion}-windows-x86_64.zip -OutFile ${elasticAgentName}-${agentVersion}-windows-x86_64.zip ${windowsDownloadSourceProxyArgs}
Expand-Archive .\${elasticAgentName}-${agentVersion}-windows-x86_64.zip -DestinationPath .
cd ${elasticAgentName}-${agentVersion}-windows-x86_64
.\\elastic-agent.exe install`;

  const k8sCommand = `kubectl apply -f ${elasticAgentName}-standalone-kubernetes.yml`;

  return {
    linux: linuxCommand,
    mac: macCommand,
    windows: windowsCommand,
    deb: linuxDebCommand,
    rpm: linuxRpmCommand,
    kubernetes: k8sCommand,
  };
};
