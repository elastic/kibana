/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StandaloneInstructions } from '.';

describe('StandaloneInstructions', () => {
  describe('With basic parameters', () => {
    const result = StandaloneInstructions({
      agentVersion: '9.0.0',
    });

    it('should return instructions for linux_aarch64', () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        'cd elastic-agent-9.0.0-linux-arm64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for linux_x86_64', () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for deb_aarch64', () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-arm64.deb ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for deb_x86_64', () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for rpm_aarch64', () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for rpm_x86_64', () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for mac_aarch64', () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for mac_x86_64', () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for windows', () => {
      expect(result.windows.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.zip -OutFile elastic-agent-9.0.0-windows-x86_64.zip ',
        'Expand-Archive .elastic-agent-9.0.0-windows-x86_64.zip -DestinationPath .',
        'cd elastic-agent-9.0.0-windows-x86_64',
        '.\\elastic-agent.exe install',
      ]);
    });

    it('should return instructions for windows msi', () => {
      expect(result.windows_msi.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.msi -OutFile elastic-agent-9.0.0-windows-x86_64.msi ',
        '.\\elastic-agent-9.0.0-windows-x86_64.msi install',
      ]);
    });

    it('should return instructions for kubernetes', () => {
      expect(result.kubernetes).toEqual('kubectl apply -f elastic-agent-standalone-kubernetes.yml');
    });
  });

  describe('With downloadSource and downloadSourceProxy', () => {
    const result = StandaloneInstructions({
      agentVersion: '9.0.0',
      downloadSource: {
        name: 'ds',
        host: 'http://localregistry.co',
        proxy_id: 'ds_id',
      } as any,
      downloadSourceProxy: {
        id: 'ds_id',
        name: 'ds-proxy',
        url: 'http://ds-proxy',
      },
    });

    it('should return instructions for linux_aarch64', () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        'cd elastic-agent-9.0.0-linux-arm64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for linux_x86_64', () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for deb_aarch64', () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb --proxy http://ds-proxy',
        'sudo dpkg -i elastic-agent-9.0.0-arm64.deb ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for deb_x86_64', () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb --proxy http://ds-proxy',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for rpm_aarch64', () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm --proxy http://ds-proxy',
        'sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for rpm_x86_64', () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm --proxy http://ds-proxy',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm ',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent',
      ]);
    });

    it('should return instructions for mac_aarch64', () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for mac_x86_64', () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install',
      ]);
    });

    it('should return instructions for windows', () => {
      expect(result.windows.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.zip -OutFile elastic-agent-9.0.0-windows-x86_64.zip -Proxy "http://ds-proxy"',
        'Expand-Archive .elastic-agent-9.0.0-windows-x86_64.zip -DestinationPath .',
        'cd elastic-agent-9.0.0-windows-x86_64',
        '.\\elastic-agent.exe install',
      ]);
    });

    it('should return instructions for windows msi', () => {
      expect(result.windows_msi.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.msi -OutFile elastic-agent-9.0.0-windows-x86_64.msi -Proxy "http://ds-proxy"',
        '.\\elastic-agent-9.0.0-windows-x86_64.msi install',
      ]);
    });

    it('should return instructions for kubernetes', () => {
      expect(result.kubernetes).toEqual('kubectl apply -f elastic-agent-standalone-kubernetes.yml');
    });
  });
});
