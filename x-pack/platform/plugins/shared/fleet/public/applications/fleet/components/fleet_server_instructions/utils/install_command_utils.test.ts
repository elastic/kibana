/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstallCommandForPlatform } from './install_command_utils';

describe('getInstallCommandForPlatform', () => {
  describe('without policy id', () => {
    it('should return the correct command if the the policyId is not set for linux', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'linux_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz
        cd elastic-agent-9.0.0-linux-arm64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'linux_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz
        cd elastic-agent-9.0.0-linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is not set for mac', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'mac_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz
        cd elastic-agent-9.0.0-darwin-aarch64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'mac_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz
        cd elastic-agent-9.0.0-darwin-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is not set for windows', () => {
      const res = getInstallCommandForPlatform({
        platform: 'windows',
        esOutputHost: 'http://elasticsearch:9200',
        serviceToken: 'service-token-1',
      });

      expect(res).toMatchInlineSnapshot(`
        "$ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent--windows-x86_64.zip -OutFile elastic-agent--windows-x86_64.zip
        Expand-Archive .\\\\elastic-agent--windows-x86_64.zip
        cd elastic-agent--windows-x86_64
        .\\\\elastic-agent.exe install \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is not set for rpm', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm
        sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm
        sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is not set for deb', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'deb_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb
        sudo dpkg -i elastic-agent-9.0.0-arm64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'deb_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb
        sudo dpkg -i elastic-agent-9.0.0-amd64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command sslCATrustedFingerprint option is passed', () => {
      const res = getInstallCommandForPlatform({
        platform: 'linux_x86_64',
        esOutputHost: 'http://elasticsearch:9200',
        serviceToken: 'service-token-1',
        sslCATrustedFingerprint: 'fingerprint123456',
      });

      expect(res).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent--linux-x86_64.tar.gz
        tar xzvf elastic-agent--linux-x86_64.tar.gz
        cd elastic-agent--linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-es-ca-trusted-fingerprint=fingerprint123456 \\\\
          --fleet-server-port=8220"
      `);
    });
  });

  describe('with policy id', () => {
    it('should return the correct command if the the policyId is set for linux', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'linux_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz
        cd elastic-agent-9.0.0-linux-arm64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'linux_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz
        cd elastic-agent-9.0.0-linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for mac', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'mac_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz
        cd elastic-agent-9.0.0-darwin-aarch64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'mac_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz
        cd elastic-agent-9.0.0-darwin-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for windows', () => {
      const res = getInstallCommandForPlatform({
        platform: 'windows',
        esOutputHost: 'http://elasticsearch:9200',
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
      });

      expect(res).toMatchInlineSnapshot(`
        "$ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent--windows-x86_64.zip -OutFile elastic-agent--windows-x86_64.zip
        Expand-Archive .\\\\elastic-agent--windows-x86_64.zip
        cd elastic-agent--windows-x86_64
        .\\\\elastic-agent.exe install \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm
        sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm
        sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for deb', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'deb_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb
        sudo dpkg -i elastic-agent-9.0.0-arm64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'deb_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb
        sudo dpkg -i elastic-agent-9.0.0-amd64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);
    });
  });

  describe('with policy id and downloadSource', () => {
    it('should return the correct command if the the policyId is set for linux', () => {
      const res = getInstallCommandForPlatform({
        platform: 'linux_x86_64',
        esOutputHost: 'http://elasticsearch:9200',
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        downloadSource: {
          id: 'test',
          name: 'test',
          is_default: false,
          host: 'https://test.fr/8.12.0-test/',
        },
      });

      expect(res).toMatchInlineSnapshot(`
        "curl -L -O https://test.fr/8.12.0-test/beats/elastic-agent/elastic-agent--linux-x86_64.tar.gz
        tar xzvf elastic-agent--linux-x86_64.tar.gz
        cd elastic-agent--linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220"
      `);
    });
  });

  describe('with policy id and fleet server host and production deployment', () => {
    it('should return the correct command if the the policyId is set for linux', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'linux_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz
        cd elastic-agent-9.0.0-linux-arm64
        sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'linux_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz
        cd elastic-agent-9.0.0-linux-x86_64
        sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for mac', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'mac_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz
        cd elastic-agent-9.0.0-darwin-aarch64
        sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'mac_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz
        tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz
        cd elastic-agent-9.0.0-darwin-x86_64
        sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for windows', () => {
      const res = getInstallCommandForPlatform({
        platform: 'windows',
        esOutputHost: 'http://elasticsearch:9200',
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        isProductionDeployment: true,
      });

      expect(res).toMatchInlineSnapshot(`
        "$ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent--windows-x86_64.zip -OutFile elastic-agent--windows-x86_64.zip
        Expand-Archive .\\\\elastic-agent--windows-x86_64.zip
        cd elastic-agent--windows-x86_64
        .\\\\elastic-agent.exe install --url=http://fleetserver:8220 \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --certificate-authorities=<PATH_TO_CA> \`
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \`
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \`
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \`
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm
        sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm
        sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);
    });

    it('should return the correct command if the the policyId is set for deb', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'deb_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb
        sudo dpkg -i elastic-agent-9.0.0-arm64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'deb_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          isProductionDeployment: true,
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb
        sudo dpkg -i elastic-agent-9.0.0-amd64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY> \\\\
          --fleet-server-port=8220"
      `);
    });
  });

  describe('with simple proxy settings', () => {
    it('should return the correct command if proxies are set for linux', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'linux_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz --proxy http://download-src-proxy:2222
        tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz
        cd elastic-agent-9.0.0-linux-arm64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'linux_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz --proxy http://download-src-proxy:2222
        tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz
        cd elastic-agent-9.0.0-linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);
    });

    it('should return the correct command if proxies are set for mac', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'mac_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz --proxy http://download-src-proxy:2222
        tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz
        cd elastic-agent-9.0.0-darwin-aarch64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'mac_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz --proxy http://download-src-proxy:2222
        tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz
        cd elastic-agent-9.0.0-darwin-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);
    });

    it('should return the correct command if proxies are set for windows', () => {
      const res = getInstallCommandForPlatform({
        platform: 'windows',
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          is_preconfigured: false,
        },
      });

      expect(res).toMatchInlineSnapshot(`
        "$ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent--windows-x86_64.zip -OutFile elastic-agent--windows-x86_64.zip -Proxy \\"http://download-src-proxy:2222\\"
        Expand-Archive .\\\\elastic-agent--windows-x86_64.zip
        cd elastic-agent--windows-x86_64
        .\\\\elastic-agent.exe install \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --fleet-server-port=8220 \`
          --proxy-url=http://es-proxy:1111"
      `);
    });

    it('should return the correct command if proxies are set for rpm', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm --proxy http://download-src-proxy:2222
        sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'rpm_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm --proxy http://download-src-proxy:2222
        sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);
    });

    it('should return the correct command if proxies are set for deb', () => {
      expect(
        getInstallCommandForPlatform({
          platform: 'deb_aarch64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb --proxy http://download-src-proxy:2222
        sudo dpkg -i elastic-agent-9.0.0-arm64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);

      expect(
        getInstallCommandForPlatform({
          platform: 'deb_x86_64',
          kibanaVersion: '9.0.0',
          esOutputHost: 'http://elasticsearch:9200',
          esOutputProxy: {
            id: 'es-proxy',
            name: 'es-proxy',
            url: 'http://es-proxy:1111',
            is_preconfigured: false,
          },
          serviceToken: 'service-token-1',
          policyId: 'policy-1',
          fleetServerHost: 'http://fleetserver:8220',
          downloadSource: {
            id: 'download-src',
            name: 'download-src',
            host: 'https://download-src/8.12.0-test/',
            is_default: false,
            proxy_id: 'download-proxy',
          },
          downloadSourceProxy: {
            id: 'download-src-proxy',
            name: 'download-src-proxy',
            url: 'http://download-src-proxy:2222',
            is_preconfigured: false,
          },
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb --proxy http://download-src-proxy:2222
        sudo dpkg -i elastic-agent-9.0.0-amd64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111"
      `);
    });
  });

  describe('with full proxy settings', () => {
    it('should return the correct command if proxies are set for linux', () => {
      const args = {
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          proxy_headers: {
            'X-Forwarded-For': 'forwarded-value',
            'test-header': 'test-value',
          },
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          proxy_headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'second-header': 'second-value',
          },
          is_preconfigured: false,
        },
      };

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'linux_aarch64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-linux-arm64.tar.gz --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        tar xzvf elastic-agent-9.0.0-linux-arm64.tar.gz
        cd elastic-agent-9.0.0-linux-arm64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'linux_x86_64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-linux-x86_64.tar.gz --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        tar xzvf elastic-agent-9.0.0-linux-x86_64.tar.gz
        cd elastic-agent-9.0.0-linux-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);
    });

    it('should return the correct command if proxies are set for mac', () => {
      const args = {
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          proxy_headers: {
            'X-Forwarded-For': 'forwarded-value',
            'test-header': 'test-value',
          },
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          proxy_headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'second-header': 'second-value',
          },
          is_preconfigured: false,
        },
      };

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'mac_aarch64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-darwin-aarch64.tar.gz --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        tar xzvf elastic-agent-9.0.0-darwin-aarch64.tar.gz
        cd elastic-agent-9.0.0-darwin-aarch64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'mac_x86_64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-darwin-x86_64.tar.gz --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        tar xzvf elastic-agent-9.0.0-darwin-x86_64.tar.gz
        cd elastic-agent-9.0.0-darwin-x86_64
        sudo ./elastic-agent install \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);
    });

    it('should return the correct command if proxies are set for windows', () => {
      const res = getInstallCommandForPlatform({
        platform: 'windows',
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          proxy_headers: {
            'X-Forwarded-For': 'forwarded-value',
            'test-header': 'test-value',
          },
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          proxy_headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'second-header': 'second-value',
          },
          is_preconfigured: false,
        },
      });

      expect(res).toMatchInlineSnapshot(`
        "$ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent--windows-x86_64.zip -OutFile elastic-agent--windows-x86_64.zip -Proxy \\"http://download-src-proxy:2222\\" -Headers @{\\"Accept-Language\\"=\\"en-US,en;q=0.5\\"; \\"second-header\\"=\\"second-value\\"}
        Expand-Archive .\\\\elastic-agent--windows-x86_64.zip
        cd elastic-agent--windows-x86_64
        .\\\\elastic-agent.exe install \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --fleet-server-port=8220 \`
          --proxy-url=http://es-proxy:1111 \`
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \`
          --proxy-header=\\"test-header=test-value\\""
      `);
    });

    it('should return the correct command if proxies are set for rpm', () => {
      const args = {
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          proxy_headers: {
            'X-Forwarded-For': 'forwarded-value',
            'test-header': 'test-value',
          },
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          proxy_headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'second-header': 'second-value',
          },
          is_preconfigured: false,
        },
      };

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'rpm_aarch64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-aarch64.rpm --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        sudo rpm -vi elastic-agent-9.0.0-aarch64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'rpm_x86_64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-x86_64.rpm --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        sudo rpm -vi elastic-agent-9.0.0-x86_64.rpm
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);
    });

    it('should return the correct command if proxies are set for deb', () => {
      const args = {
        esOutputHost: 'http://elasticsearch:9200',
        esOutputProxy: {
          id: 'es-proxy',
          name: 'es-proxy',
          url: 'http://es-proxy:1111',
          proxy_headers: {
            'X-Forwarded-For': 'forwarded-value',
            'test-header': 'test-value',
          },
          is_preconfigured: false,
        },
        serviceToken: 'service-token-1',
        policyId: 'policy-1',
        fleetServerHost: 'http://fleetserver:8220',
        downloadSource: {
          id: 'download-src',
          name: 'download-src',
          host: 'https://download-src/8.12.0-test/',
          is_default: false,
          proxy_id: 'download-proxy',
        },
        downloadSourceProxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'http://download-src-proxy:2222',
          proxy_headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'second-header': 'second-value',
          },
          is_preconfigured: false,
        },
      };

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'deb_aarch64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-arm64.deb --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        sudo dpkg -i elastic-agent-9.0.0-arm64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);

      expect(
        getInstallCommandForPlatform({
          ...args,
          platform: 'deb_x86_64',
          kibanaVersion: '9.0.0',
        })
      ).toMatchInlineSnapshot(`
        "curl -L -O https://download-src/8.12.0-test/beats/elastic-agent/elastic-agent-9.0.0-amd64.deb --proxy http://download-src-proxy:2222 --proxy-header \\"Accept-Language=en-US,en;q=0.5\\" --proxy-header \\"second-header=second-value\\"
        sudo dpkg -i elastic-agent-9.0.0-amd64.deb
        sudo systemctl enable elastic-agent
        sudo systemctl start elastic-agent
        sudo elastic-agent enroll \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --fleet-server-port=8220 \\\\
          --proxy-url=http://es-proxy:1111 \\\\
          --proxy-header=\\"X-Forwarded-For=forwarded-value\\" \\\\
          --proxy-header=\\"test-header=test-value\\""
      `);
    });
  });
});
