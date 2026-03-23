/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManualInstructions } from '.';

describe('ManualInstructions', () => {
  describe('With basic parameters', () => {
    const result = ManualInstructions({
      apiKey: 'APIKEY',
      fleetServerHost: 'https://testhost',
      agentVersion: '9.0.0',
    });

    it('should return instructions for linux', () => {
      expect(result.linux.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for mac', () => {
      expect(result.mac.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for deb', () => {
      expect(result.deb.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm', () => {
      expect(result.rpm.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for windows', () => {
      expect(result.windows.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.zip -OutFile elastic-agent-9.0.0-windows-x86_64.zip ',
        'Expand-Archive .\\elastic-agent-9.0.0-windows-x86_64.zip -DestinationPath .',
        'cd elastic-agent-9.0.0-windows-x86_64',
        '.\\elastic-agent.exe install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for kubernetes', () => {
      expect(result.kubernetes).toEqual('kubectl apply -f elastic-agent-managed-kubernetes.yml');
    });
  });

  describe('With fleetProxy', () => {
    const result = ManualInstructions({
      apiKey: 'APIKEY',
      fleetServerHost: 'https://testhost',
      agentVersion: '9.0.0',
      fleetProxy: {
        url: 'http://test-proxy',
        proxy_headers: { test1: 'header' },
      },
    });

    it('should return instructions for linux', () => {
      expect(result.linux.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for mac', () => {
      expect(result.mac.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for deb', () => {
      expect(result.deb.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for rpm', () => {
      expect(result.rpm.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for windows', () => {
      expect(result.windows.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.zip -OutFile elastic-agent-9.0.0-windows-x86_64.zip ',
        'Expand-Archive .\\elastic-agent-9.0.0-windows-x86_64.zip -DestinationPath .',
        'cd elastic-agent-9.0.0-windows-x86_64',
        '.\\elastic-agent.exe install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for kubernetes', () => {
      expect(result.kubernetes).toEqual('kubectl apply -f elastic-agent-managed-kubernetes.yml');
    });

    it('should return instructions for googleCloudShell', () => {
      expect(result.googleCloudShell.split('\n')).toEqual([
        'gcloud config set project <PROJECT_ID> &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" STACK_VERSION=9.0.0 ./deploy.sh',
      ]);
    });
  });

  describe('With downloadSource and downloadSourceProxy', () => {
    const result = ManualInstructions({
      apiKey: 'APIKEY',
      fleetServerHost: 'https://testhost',
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
      } as any,
    });

    it('should return instructions for linux', () => {
      expect(result.linux.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for mac', () => {
      expect(result.mac.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for deb', () => {
      expect(result.deb.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb --proxy http://ds-proxy',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm', () => {
      expect(result.rpm.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm --proxy http://ds-proxy',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for windows', () => {
      expect(result.windows.split('\n')).toEqual([
        "$ProgressPreference = 'SilentlyContinue'",
        'Invoke-WebRequest -Uri http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-windows-x86_64.zip -OutFile elastic-agent-9.0.0-windows-x86_64.zip -Proxy "http://ds-proxy"',
        'Expand-Archive .\\elastic-agent-9.0.0-windows-x86_64.zip -DestinationPath .',
        'cd elastic-agent-9.0.0-windows-x86_64',
        '.\\elastic-agent.exe install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for kubernetes', () => {
      expect(result.kubernetes).toEqual('kubectl apply -f elastic-agent-managed-kubernetes.yml');
    });
  });

  describe('For googleCloudShell', () => {
    it('should return instructions with basic commands', () => {
      const result = ManualInstructions({
        apiKey: 'APIKEY',
        fleetServerHost: 'https://testhost',
        agentVersion: '9.0.0',
      });
      expect(result.googleCloudShell).toEqual(
        'gcloud config set project <PROJECT_ID> &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh'
      );
    });

    it('should return correct project_id', () => {
      const result = ManualInstructions({
        apiKey: 'APIKEY',
        fleetServerHost: 'https://testhost',
        agentVersion: '9.0.0',
        gcpProjectId: 'gcpID',
      });
      expect(result.googleCloudShell).toEqual(
        'gcloud config set project gcpID &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh'
      );
    });

    it('should return gcpProjectId when gcpAccountType = organization-account', () => {
      const result = ManualInstructions({
        apiKey: 'APIKEY',
        fleetServerHost: 'https://testhost',
        agentVersion: '9.0.0',
        gcpAccountType: 'organization-account',
        gcpOrganizationId: 'test-org',
      });
      expect(result.googleCloudShell).toEqual(
        'gcloud config set project <PROJECT_ID> && ORG_ID=test-org FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh'
      );
    });

    it('should not return gcpProjectId when gcpAccountType != organization-account', () => {
      const result = ManualInstructions({
        apiKey: 'APIKEY',
        fleetServerHost: 'https://testhost',
        agentVersion: '9.0.0',
        gcpAccountType: '',
        gcpOrganizationId: 'test-org',
      });
      expect(result.googleCloudShell).toEqual(
        'gcloud config set project <PROJECT_ID> &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh'
      );
    });
  });
});
