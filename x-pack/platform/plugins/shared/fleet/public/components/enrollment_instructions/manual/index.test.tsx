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

    it('should return instructions for linux_aarch64', async () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz ',
        '  tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        '  cd elastic-agent-9.0.0-linux-arm64',
        '  sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for linux_x86_64', async () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for deb_aarch64', async () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-arm64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for deb_x86_64', async () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_aarch64', async () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_x86_64', async () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for mac_aarch64', async () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for mac_x86_64', async () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for kubernetes', async () => {
      expect(result.kubernetes.split('\n')).toEqual([
        'kubectl apply -f elastic-agent-managed-kubernetes.yml',
      ]);
    });
  });

  describe('With showInstallServers', () => {
    const result = ManualInstructions({
      apiKey: 'APIKEY',
      fleetServerHost: 'https://testhost',
      agentVersion: '9.0.0',
      showInstallServers: true,
    });

    it('should return instructions for linux_aarch64', async () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz ',
        '  tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        '  cd elastic-agent-9.0.0-linux-arm64',
        '  sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --install-servers',
      ]);
    });

    it('should return instructions for linux_x86_64', async () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --install-servers',
      ]);
    });

    it('should return instructions for deb_aarch64', async () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb ',
        'sudo ELASTIC_AGENT_FLAVOR=servers dpkg -i elastic-agent-9.0.0-arm64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for deb_x86_64', async () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo ELASTIC_AGENT_FLAVOR=servers dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_aarch64', async () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm ',
        'sudo ELASTIC_AGENT_FLAVOR=servers rpm -vi elastic-agent-9.0.0-aarch64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_x86_64', async () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo ELASTIC_AGENT_FLAVOR=servers rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for mac_aarch64', async () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --install-servers',
      ]);
    });

    it('should return instructions for mac_x86_64', async () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --install-servers',
      ]);
    });

    it('should return instructions for kubernetes', async () => {
      expect(result.kubernetes.split('\n')).toEqual([
        'kubectl apply -f elastic-agent-managed-kubernetes.yml',
      ]);
    });

    it('should return instructions for googleCloudShell', async () => {
      expect(result.googleCloudShell.split('\n')).toEqual([
        'gcloud config set project <PROJECT_ID> &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh',
      ]);
    });
  });

  describe('With fleetProxy', () => {
    const result = ManualInstructions({
      apiKey: 'APIKEY',
      fleetServerHost: 'https://testhost',
      agentVersion: '9.0.0',
      fleetProxy: {
        id: 'id1',
        name: 'test-proxy',
        url: 'http://test-proxy',
        is_preconfigured: false,
        proxy_headers: { test1: 'header' },
      },
    });

    it('should return instructions for linux_aarch64', async () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz ',
        '  tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        '  cd elastic-agent-9.0.0-linux-arm64',
        '  sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for linux_x86_64', async () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for deb_aarch64', async () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-arm64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for deb_x86_64', async () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb ',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for rpm_aarch64', async () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for rpm_x86_64', async () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm ',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header" ',
        '',
      ]);
    });

    it('should return instructions for mac_aarch64', async () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for mac_x86_64', async () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz ',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY --proxy-url=http://test-proxy --proxy-header "test1=header"',
      ]);
    });

    it('should return instructions for kubernetes', async () => {
      expect(result.kubernetes.split('\n')).toEqual([
        'kubectl apply -f elastic-agent-managed-kubernetes.yml',
      ]);
    });

    it('should return instructions for googleCloudShell', async () => {
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

    it('should return instructions for linux_aarch64', async () => {
      expect(result.linux_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz --proxy http://ds-proxy',
        '  tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz',
        '  cd elastic-agent-9.0.0-linux-arm64',
        '  sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for linux_x86_64', async () => {
      expect(result.linux_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-linux-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for deb_aarch64', async () => {
      expect(result.deb_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb --proxy http://ds-proxy',
        'sudo dpkg -i elastic-agent-9.0.0-arm64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for deb_x86_64', async () => {
      expect(result.deb_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb --proxy http://ds-proxy',
        'sudo dpkg -i elastic-agent-9.0.0-amd64.deb',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_aarch64', async () => {
      expect(result.rpm_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm --proxy http://ds-proxy',
        'sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for rpm_x86_64', async () => {
      expect(result.rpm_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm --proxy http://ds-proxy',
        'sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm',
        'sudo systemctl enable elastic-agent ',
        'sudo systemctl start elastic-agent ',
        'sudo elastic-agent enroll --url=https://testhost --enrollment-token=APIKEY ',
        '',
      ]);
    });

    it('should return instructions for mac_aarch64', async () => {
      expect(result.mac_aarch64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-aarch64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for mac_x86_64', async () => {
      expect(result.mac_x86_64.split('\n')).toEqual([
        'curl -L -O http://localregistry.co/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz --proxy http://ds-proxy',
        'tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz',
        'cd elastic-agent-9.0.0-darwin-x86_64',
        'sudo ./elastic-agent install --url=https://testhost --enrollment-token=APIKEY',
      ]);
    });

    it('should return instructions for kubernetes', async () => {
      expect(result.kubernetes.split('\n')).toEqual([
        'kubectl apply -f elastic-agent-managed-kubernetes.yml',
      ]);
    });
  });

  describe('For googleCloudShell', () => {
    it('should return instructions with basic commands', async () => {
      const result = ManualInstructions({
        apiKey: 'APIKEY',
        fleetServerHost: 'https://testhost',
        agentVersion: '9.0.0',
      });
      expect(result.googleCloudShell).toEqual(
        'gcloud config set project <PROJECT_ID> &&  FLEET_URL=https://testhost ENROLLMENT_TOKEN=APIKEY STACK_VERSION=9.0.0 ./deploy.sh'
      );
    });

    it('should return correct project_id', async () => {
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

    it('should return gcpProjectId when gcpAccountType = organization-account', async () => {
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

    it('should not return gcpProjectId when gcpAccountType != organization-account', async () => {
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
