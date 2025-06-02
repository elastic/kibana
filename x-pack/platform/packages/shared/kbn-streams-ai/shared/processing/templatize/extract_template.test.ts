/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractTemplate } from '.';
import { ToolingLog } from '@kbn/tooling-log';
import { SampleParserClient, StreamLogGenerator } from '@kbn/sample-log-parser';

describe('extractTemplate', () => {
  const client = new SampleParserClient({
    logger: new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    }),
  });

  let generators: StreamLogGenerator[];

  beforeAll(async () => {
    generators = await client.getLogGenerators({ rpm: 16 * 2000, distribution: 'uniform' });
  });

  async function getLogsFrom(name: string) {
    const generator = generators.find((gen) => gen.name === name);

    if (!generator) {
      throw new Error(`Could not find generator for ${name}`);
    }

    const start = new Date('2025-05-01T00:00:00.000Z').getTime();
    const end = new Date('2025-05-01T00:01:00.000Z').getTime() - 1;

    const docs = await generator.next(start);
    docs.push(...(await generator.next(end)));

    return docs.map((doc) => doc.message);
  }

  it('processes android logs correctly', async () => {
    const androidLogs = await getLogsFrom('Android');

    const result = await extractTemplate(androidLogs);

    // 03-17 16:13:38.819  1702  8671 D PowerManagerService: acquire lock=233570404, flags=0x1, tag="View Lock", name=com.android.systemui, ws=null, uid=10037, pid=2227
    expect(result.root.formatted.display).toBe(
      '00-00\\s00:00:00.000\\s+(\\d{4,5})\\s+(\\d{4,5})\\s(D|V|I|W|E)\\s<WORD>:\\s<GREEDYDATA>'
    );
    expect(result.root.formatted.grok).toBe(
      '%{MONTHDAY:field_0}-%{MONTHDAY:field_2}\\s%{INT:field_3}:%{INT:field_5}:%{INT:field_7}\\.%{INT:field_9}\\s+%{INT:field_10}\\s+%{INT:field_11}\\s%{WORD:field_12}\\s%{WORD:field_13}:\\s%{GREEDYDATA:field_17}'
    );
  });

  it('processes thunderbird logs correctly', async () => {
    const thunderbirdLogs = await getLogsFrom('Thunderbird');
    const result = await extractTemplate(thunderbirdLogs);

    // - 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root
    // - 1131566503 2005.11.09 aadmin1 Nov 9 12:01:43 src@aadmin1 dhcpd: DHCPACK on 10.100.4.251 to 00:11:43:e3:ba:c3 via eth1
    // - 1131566517 2005.11.09 tbird-admin1 Nov 9 12:01:57 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A2] datasource
    expect(result.root.formatted.display).toBe(
      '-\\s0000000000\\s0000.00.00\\s<NOTSPACE>\\s<SYSLOGTIMESTAMP>\\s<GREEDYDATA>'
    );

    expect(result.root.formatted.grok).toBe(
      '-\\s%{INT:field_1}\\s%{INT:field_2}\\.%{MONTHDAY:field_4}\\.%{MONTHDAY:field_6}\\s%{NOTSPACE:field_7}\\s%{SYSLOGTIMESTAMP:field_8}\\s%{GREEDYDATA:field_13}'
    );
  });

  it('processes zookeeper logs correctly', async () => {
    const zookeeperLogs = await getLogsFrom('Zookeeper');
    const result = await extractTemplate(zookeeperLogs);

    // 2015-07-29 17:41:44,747 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@774] - Notification time out: 3200
    expect(result.root.formatted.display).toBe(
      '<TIMESTAMP_ISO8601>\\s-\\s(INFO|WARN|ERROR)\\s+[<DATA>@(\\d{2,4})]\\s-\\s<GREEDYDATA>'
    );

    expect(result.root.formatted.grok).toBe(
      '%{TIMESTAMP_ISO8601:field_0}\\s-\\s%{LOGLEVEL:field_2}\\s+\\[%{DATA:field_4}@%{INT:field_6}\\]\\s-\\s%{GREEDYDATA:field_11}'
    );
  });

  it('processes mac logs correctly', async () => {
    const macLogs = await getLogsFrom('Mac');
    const result = await extractTemplate(macLogs);

    // Jul  8 07:29:50 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 14:29:50 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
    // Jul  1 09:29:02 calvisitor-10-105-160-95 sandboxd[129] ([31211]): com.apple.Addres(31211) deny network-outbound /private/var/run/mDNSResponder

    expect(result.root.formatted.display).toBe('<SYSLOGTIMESTAMP>\\s<GREEDYDATA>');
    expect(result.root.formatted.grok).toBe('%{SYSLOGTIMESTAMP:field_0}\\s%{GREEDYDATA:field_5}');
  });

  it('processes Proxifier logs correctly', async () => {
    const proxifierLogs = await getLogsFrom('Proxifier');
    const result = await extractTemplate(proxifierLogs);

    // [07.26 13:59:44] chrome.exe *64 - www.google.com.hk:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
    // [07.26 14:03:57] chrome.exe *64 - notifications.google.com:443 close, 470 bytes sent, 4856 bytes (4.74 KB) received, lifetime 04:00
    // [07.26 14:04:50] chrome.exe *64 - apis.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
    // [07.26 14:05:04] chrome.exe *64 - csi.gstatic.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
    // [07.26 14:05:04] chrome.exe *64 - clients6.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
    // [07.26 14:05:07] Dropbox.exe - block.dropbox.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
    expect(result.root.formatted.display).toBe(
      '[00.00\\s00:00:00]\\s<NOTSPACE>.exe\\s<GREEDYDATA>'
    );

    expect(result.root.formatted.grok).toBe(
      '\\[%{MONTHDAY:field_1}\\.%{MONTHDAY:field_3}\\s%{INT:field_5}:%{INT:field_7}:%{INT:field_9}\\]\\s%{NOTSPACE:field_11}\\.%{WORD:field_13}\\s%{GREEDYDATA:field_22}'
    );
  });

  it('generates a consistent root template structure', async () => {
    // Test with a simple, consistent set of logs
    const simpleLogs = [
      '2023-05-30 12:34:56 INFO  Service started on port 8080',
      '2023-05-30 12:35:02 WARN  Service high memory usage: 85%',
      '2023-05-30 12:35:10 ERROR Service crashed with exit code 1',
    ];
    const result = await extractTemplate(simpleLogs);

    expect(result.root.formatted.display).toBe(
      '<TIMESTAMP_ISO8601>\\s(INFO|WARN|ERROR)\\s+Service\\s(started|high|crashed)\\s(on|memory|with)\\s<GREEDYDATA>'
    );

    expect(result.root.formatted.grok).toBe(
      '%{TIMESTAMP_ISO8601:field_0}\\s%{LOGLEVEL:field_1}\\s+%{WORD:field_2}\\s%{WORD:field_3}\\s%{WORD:field_4}\\s%{GREEDYDATA:field_8}'
    );
  });

  it('handles varying column counts across messages', async () => {
    // Test with logs that have different numbers of columns
    const mixedLogs = [
      'App 123 started',
      'App 123 stopped with code 0',
      'App 123 error: connection refused',
    ];

    const result = await extractTemplate(mixedLogs);

    expect(result.root.formatted.display).toBe('App\\s000\\s<GREEDYDATA>');

    expect(result.root.formatted.grok).toBe(
      '%{WORD:field_0}\\s%{INT:field_1}\\s%{GREEDYDATA:field_4}'
    );
  });

  it('detects and handles special patterns correctly', async () => {
    // Test with logs containing IP addresses, numbers, and other special patterns
    const specialLogs = [
      'Connection from 192.168.1.1 port 8080 established',
      'Connection from 10.0.0.254 port 443 established',
      'Connection from 172.16.0.1 port 22 established',
    ];

    const result = await extractTemplate(specialLogs);

    expect(result.root.formatted.display).toBe(
      'Connection\\sfrom\\s<IPV4>\\sport\\s(\\d{2,4})\\sestablished'
    );

    expect(result.root.formatted.grok).toBe(
      '%{WORD:field_0}\\s%{WORD:field_1}\\s%{IPV4:field_2}\\s%{WORD:field_3}\\s%{INT:field_4}\\s%{WORD:field_5}'
    );
  });

  it('detects and handles quoted strings correctly', async () => {
    const specialLogs = ['Foo "Quoted string"'];

    const result = await extractTemplate(specialLogs);

    expect(result.templates[0].columns.length).toBe(2);
  });

  it('handles complex structures', async () => {
    const complexLogs = [
      'nova-compute.manager.log.1.2017-05-16_13:55:31 2025-06-01 11:39:54.880 2931 INFO nova.compute.manager [req-8ea4052c-895d-4b64-9e2d-04d64c4d94ab - - - - -] [instance: 88dc1847-8848-49cc-933e-9239b12c9dcf] VM Stopped (Lifecycle Event)',
      'nova-compute.log.2.2018-06-17_13:57:31 2025-06-01 11:39:54.880 2931 INFO nova.compute [req-3ea4052c-895d-4b64-9e2d-04d64c4d94ab - - - - -] [instance: 78dc1847-8848-49cc-933e-9239b12c9dcf] VM Resumed (Lifecycle Event)',
    ];

    const result = await extractTemplate(complexLogs);

    expect(result.root.formatted.display).toBe(
      'nova-<NOTSPACE>-00-<WORD>:00:00\\s2025-06-01\\s11:39:54.880\\s0000\\sINFO\\s<NOTSPACE>\\s[req-<UUID>\\s-\\s-\\s-\\s-\\s-]\\s[instance:\\s<UUID>]\\sVM\\s<GREEDYDATA>'
    );

    expect(result.root.formatted.grok).toBe(
      '%{WORD:field_0}-%{NOTSPACE:field_2}-%{MONTHDAY:field_4}-%{WORD:field_6}:%{INT:field_8}:%{MONTHDAY:field_10}\\s%{TIMESTAMP_ISO8601:field_11}\\s%{INT:field_12}\\s%{LOGLEVEL:field_13}\\s%{NOTSPACE:field_14}\\s\\[%{WORD:field_16}-%{UUID:field_18}\\s-\\s-\\s-\\s-\\s-\\]\\s\\[%{WORD:field_31}:\\s%{UUID:field_34}\\]\\s%{WORD:field_36}\\s%{GREEDYDATA:field_40}'
    );
  });
});
