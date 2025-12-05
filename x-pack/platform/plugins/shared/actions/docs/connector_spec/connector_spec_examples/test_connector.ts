/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

/**
 * Simple test runner for connectors
 *
 * Usage:
 *   node test_connector.js virustotal x-apikey=YOUR_KEY scanFileHash '{"hash":"44d88612fea8a8f36de82e1278abb02f"}'
 *   node test_connector.js abuseipdb Key=YOUR_KEY checkIp '{"ipAddress":"8.8.8.8"}'
 *   node test_connector.js shodan X-Api-Key=YOUR_KEY getHostInfo '{"ip":"8.8.8.8"}'
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { AbuseIPDBConnector } from './abuseipdb';
import { AlienVaultOTXConnector } from './alienvault_otx';
import { GreyNoiseConnector } from './greynoise';
import { ShodanConnector } from './shodan';
import { URLVoidConnector } from './urlvoid';
import { VirusTotalConnector } from './virustotal';

const connectors = {
  virustotal: VirusTotalConnector,
  abuseipdb: AbuseIPDBConnector,
  greynoise: GreyNoiseConnector,
  shodan: ShodanConnector,
  alienvault: AlienVaultOTXConnector,
  urlvoid: URLVoidConnector,
};

async function testConnector() {
  const [connectorName, authHeader, actionName, inputJson] = process.argv.slice(2);

  if (!connectorName || !authHeader || !actionName || !inputJson) {
    console.error('Usage: node test_connector.js <connector> <header=value> <action> <input-json>');
    console.error('');
    console.error('Examples:');
    console.error(
      '  virustotal x-apikey=KEY scanFileHash \'{"hash":"44d88612fea8a8f36de82e1278abb02f"}\''
    );
    console.error('  abuseipdb Key=KEY checkIp \'{"ipAddress":"8.8.8.8"}\'');
    console.error('  greynoise key=KEY quickLookup \'{"ip":"8.8.8.8"}\'');
    console.error('  shodan X-Api-Key=KEY getHostInfo \'{"ip":"8.8.8.8"}\'');
    console.error('  alienvault X-OTX-API-KEY=KEY searchPulses \'{"limit":5}\'');
    console.error("  urlvoid X-Api-Key=KEY scanDomainStats '{}'");
    process.exit(1);
  }

  const connector = connectors[connectorName as keyof typeof connectors];
  if (!connector) {
    console.error(`Unknown connector: ${connectorName}`);
    console.error(`Available: ${Object.keys(connectors).join(', ')}`);
    process.exit(1);
  }

  const [headerName, headerValue] = authHeader.split('=');
  if (!headerName || !headerValue) {
    console.error('Invalid auth header format. Use: headerName=value');
    process.exit(1);
  }

  const action = connector.actions[actionName];
  if (!action) {
    console.error(`Unknown action: ${actionName}`);
    console.error(`Available: ${Object.keys(connector.actions).join(', ')}`);
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(inputJson);
  } catch (error) {
    console.error('Invalid JSON input:', error);
    process.exit(1);
  }

  const client: AxiosInstance = axios.create({
    headers: {
      [headerName]: headerValue,
    },
  });

  const ctx = {
    auth: {
      method: 'headers' as const,
      headers: {
        [headerName]: headerValue,
      },
    },
    client,
  };

  console.log(`\nTesting ${connector.metadata.displayName} - ${actionName}`);
  console.log('Input:', JSON.stringify(input, null, 2));
  console.log('\nExecuting...\n');

  try {
    const result = await action.handler(ctx as any, input);
    console.log('✓ Success!');
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('✗ Failed!');
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testConnector();
