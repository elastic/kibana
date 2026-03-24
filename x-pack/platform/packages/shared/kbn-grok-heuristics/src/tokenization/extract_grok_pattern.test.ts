/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractGrokPatternDangerouslySlow } from './extract_grok_pattern';
import { ToolingLog } from '@kbn/tooling-log';
import type { StreamLogGenerator } from '@kbn/sample-log-parser';
import { SampleParserClient } from '@kbn/sample-log-parser';
import { isNamedField } from '../utils';
import type { GrokPatternNode } from '../types';

function getGrokComponents(nodes: GrokPatternNode[]) {
  return nodes.map((node) => (isNamedField(node) ? node.component : node.pattern));
}

describe('extractTokensDangerouslySlow', () => {
  it('generates a consistent root template structure', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      '2023-05-30 12:34:56 INFO  Service started on port 8080',
      '2023-05-30 12:35:02 WARN  Service high memory usage: 85%',
      '2023-05-30 12:35:10 ERROR Service crashed with exit code 1',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'TIMESTAMP_ISO8601',
      '\\s',
      'LOGLEVEL',
      '\\s+',
      'GREEDYDATA',
    ]);
  });

  it('retains fields surrounded by variable whitespace', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      'Different Service started on port 8080',
      'Length    Service high memory usage: 85%',
      'Content   Service crashed with exit code 1',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'WORD', // Even though this token is just freeform text, it should not be collapsed into GREEDYDATA since it is surrounded by variable whitespace.
      '\\s+',
      'GREEDYDATA',
    ]);
  });

  it('extracts detailed patterns from error logs (collapse happens post-LLM)', async () => {
    // Test case for error logs with stack traces
    // Note: The collapse of generic patterns into GREEDYDATA now happens AFTER LLM review
    // (in collapseSequentialFields), not during initial tokenization
    const nodes = await extractGrokPatternDangerouslySlow([
      "[2025-08-07T09:01:01Z] [ERROR] Traceback (most recent call last): File \"/app/processor.py\", line 112, in process_record user_email = record['user']['email'] KeyError: 'email'",
      "[2025-08-07T09:01:02Z] [ERROR] TypeError: Cannot read properties of undefined (reading 'name') \n    at getUserName (/app/src/utils.js:12:25)\n    at /app/src/server.js:115:18\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)\n    at next (/app/node_modules/express/lib/router/route.js:144:13)",
      '[2025-08-07T09:01:03Z] [ERROR] org.springframework.dao.DataIntegrityViolationException: could not execute statement; SQL [n/a]; constraint [null]; nested exception is org.hibernate.exception.ConstraintViolationException: could not execute statement\n    at org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:276)\n    ... 87 more\nCaused by: org.hibernate.exception.ConstraintViolationException: could not execute statement\n    at org.hibernate.exception.internal.SQLStateConversionDelegate.convert(SQLStateConversionDelegate.java:112)\n    ... 96 more\nCaused by: java.sql.SQLIntegrityConstraintViolationException: ORA-01400: cannot insert NULL into ("SCHEMA_NAME"."TABLE_NAME"."COLUMN_NAME")\n    at oracle.jdbc.driver.T4CTTIoer11.processError(T4CTTIoer11.java:509)\n    ... 112 more',
      "[2025-08-07T09:01:04Z] [ERROR] System.IO.FileNotFoundException: Could not find file 'C:\\data\\input.txt'.\nFile name: 'C:\\data\\input.txt'\n    at System.IO.__Error.WinIOError(Int32 errorCode, String maybeFullPath)\n    at System.IO.FileStream.Init(String path, FileMode mode, FileAccess access, Int32 rights, Boolean useRights, FileShare share, Int32 bufferSize, FileOptions options, SECURITY_ATTRIBUTES secAttrs, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)",
    ]);

    // At the tokenization stage, we extract detailed patterns
    // The LLM will later rename these fields, and collapseSequentialFields() will collapse
    // sequential same-named fields into GREEDYDATA
    const components = getGrokComponents(nodes);

    // Verify we extract timestamp and log level correctly
    expect(components[0]).toBe('[');
    expect(components[1]).toBe('TIMESTAMP_ISO8601');
    expect(components[2]).toBe(']');
    expect(components[4]).toBe('[');
    expect(components[5]).toBe('LOGLEVEL');
    expect(components[6]).toBe(']');

    // The error message content is extracted as detailed tokens
    // (collapse happens in collapseSequentialFields after LLM review)
    expect(components.length).toBeGreaterThan(7);
  });

  it('handles varying column counts across messages', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      'App 123 started',
      'App 123 stopped with code 0',
      'App 123 error: connection refused',
    ]);

    expect(getGrokComponents(nodes)).toEqual(['WORD', '\\s', 'INT', '\\s', 'GREEDYDATA']);
  });

  it('detects and handles special patterns correctly', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      'Connection from 192.168.1.1 port 8080 established',
      'Connection from 10.0.0.254 port 443 established',
      'Connection from 172.16.0.1 port 22 established',
    ]);

    expect(getGrokComponents(nodes)).toContain('IPV4');
  });

  it('detects and handles quoted strings correctly', async () => {
    const nodes = await extractGrokPatternDangerouslySlow(['Foo "Quoted string"']);

    expect(getGrokComponents(nodes)).toEqual(['WORD', '\\s', '"', 'WORD', ' ', 'WORD', '"']);
  });

  it('prevents greedy patterns from capturing parts of subsequent tokens', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      'abc_20251119123456',
      'abc_20251119123456',
      'abc_20251119123456',
    ]);
    const patterns = getGrokComponents(nodes);

    // 'WORD' and 'NOTSPACE' would create an invalid pattern in this case since they are greedy and would capture parts of the next token.
    // We are explicitly checking neither of them are used, even though the last assertion already does that implicitly, to ensure these don't accidentally get modified.
    expect(patterns).not.toContain('WORD');
    expect(patterns).not.toContain('NOTSPACE');
    expect(patterns).toEqual(['DATA', 'DATESTAMP_EVENTLOG']);
  });

  it('detects pipe delimiter correctly', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      '123|abc|123|abc',
      '123|abc|123|abc',
      '123|abc|123|abc',
      '123|abc|123|abc',
      '123|abc|123|abc',
      '123|abc|123|abc',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'INT',
      '\\|',
      'WORD',
      '\\|',
      'INT',
      '\\|',
      'GREEDYDATA',
    ]);
  });

  it('detects variable whitespace correctly when using space delimiter', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      '123 abc - INFO    - 123',
      '123 abc - INFO    - 123',
      '123 abc - DEBUG   - 123',
      '123 abc - INFO    - 123',
      '123 abc - INFO    - 123',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'INT',
      '\\s',
      'WORD',
      '\\s',
      '-',
      '\\s',
      'LOGLEVEL',
      '\\s+', // Required variable whitespace after LOGLEVEL
      '-',
      '\\s',
      'INT',
    ]);
  });

  it('detects leading whitespace correctly when using non-space delimiter', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      '123|abc|   INFO|123',
      '123|abc|WARNING|123',
      '123|abc|   INFO|123',
      '123|abc|  DEBUG|123',
      '123|abc|   INFO|123',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'INT',
      '\\|',
      'WORD',
      '\\|',
      '\\s*', // Optional variable whitespace before LOGLEVEL
      'LOGLEVEL',
      '\\|',
      'INT',
    ]);
  });

  it('detects trailing whitespace correctly when using non-space delimiter', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      '123|abc|INFO   |123',
      '123|abc|WARNING|123',
      '123|abc|INFO   |123',
      '123|abc|DEBUG  |123',
      '123|abc|INFO   |123',
    ]);

    expect(getGrokComponents(nodes)).toEqual([
      'INT',
      '\\|',
      'WORD',
      '\\|',
      'LOGLEVEL',
      '\\s*', // Optional variable whitespace after LOGLEVEL
      '\\|',
      'INT',
    ]);
  });

  it('finds a pattern no matter how inconsistent the logs are', async () => {
    const nodes = await extractGrokPatternDangerouslySlow([
      'abc_20251119123456',
      '123 abc - INFO    - 123',
      '123|abc|INFO   |123',
      '2023-05-30 12:34:56 INFO  Service started on port 8080',
      'App 123 started',
      'Connection from 192.168.1.1 port 8080 established',
    ]);

    expect(getGrokComponents(nodes)).toEqual(['GREEDYDATA']);
  });

  describe('with LogHub sample data', () => {
    const client = new SampleParserClient({
      logger: new ToolingLog({
        level: 'silent',
        writeTo: process.stdout,
      }),
    });

    let generators: StreamLogGenerator[];

    beforeAll(async () => {
      generators = await client.getLogGenerators({
        rpm: 16 * 2000,
        distribution: 'uniform',
        systems: {
          loghub: [
            'HealthApp',
            'Android',
            'Thunderbird',
            'Zookeeper',
            'Mac',
            'OpenStack',
            'Proxifier',
          ],
        },
      });
    }, 60_000); // Ensure there's enough time to gather sample logs

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

    it('processes HealthApp logs correctly', async () => {
      const healthAppLogs = await getLogsFrom('HealthApp');
      const nodes = await extractGrokPatternDangerouslySlow(healthAppLogs);

      // 20250501-00:00:00:000|Step_LSC|30002312|onExtend:1514038530000 14 0 4
      // 20250501-00:00:00:000|Step_StandReportReceiver|30002312|onReceive action: android.intent.action.SCREEN_ON
      // 20250501-00:00:00:000|Step_LSC|30002312|processHandleBroadcastAction action:android.intent.action.SCREEN_ON
      // 20250501-00:00:00:000|Step_StandStepCounter|30002312|flush sensor data
      // 20250501-00:00:00:000|Step_SPUtils|30002312| getTodayTotalDetailSteps = 1514038440000##6993##548365##8661##12266##27164404

      expect(getGrokComponents(nodes)).toEqual([
        'INT',
        '-',
        'INT',
        ':',
        'INT',
        ':',
        'INT',
        ':',
        'INT',
        '\\|',
        'WORD',
        '\\|',
        'INT',
        '\\|',
        '\\s*',
        'GREEDYDATA',
      ]);
    });

    it('processes android logs correctly', async () => {
      const androidLogs = await getLogsFrom('Android');
      const nodes = await extractGrokPatternDangerouslySlow(androidLogs);

      // 03-17 16:13:38.819  1702  8671 D PowerManagerService: acquire lock=233570404, flags=0x1, tag="View Lock", name=com.android.systemui, ws=null, uid=10037, pid=2227

      expect(getGrokComponents(nodes)).toEqual([
        'INT',
        '-',
        'INT',
        '\\s',
        'INT',
        ':',
        'INT',
        ':',
        'INT',
        '.',
        'INT',
        '\\s+',
        'INT',
        '\\s+',
        'INT',
        '\\s',
        'WORD',
        '\\s',
        'WORD',
        ':',
        '\\s',
        'GREEDYDATA',
      ]);
    });

    it('processes thunderbird logs correctly', async () => {
      const thunderbirdLogs = await getLogsFrom('Thunderbird');
      const nodes = await extractGrokPatternDangerouslySlow(thunderbirdLogs);

      // - 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root
      // - 1131566503 2005.11.09 aadmin1 Nov 9 12:01:43 src@aadmin1 dhcpd: DHCPACK on 10.100.4.251 to 00:11:43:e3:ba:c3 via eth1
      // - 1131566517 2005.11.09 tbird-admin1 Nov 9 12:01:57 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A2] datasource

      expect(getGrokComponents(nodes)).toEqual([
        '-',
        '\\s',
        'INT',
        '\\s',
        'INT',
        '.',
        'INT',
        '.',
        'INT',
        '\\s',
        'NOTSPACE',
        '\\s',
        'SYSLOGTIMESTAMP',
        '\\s',
        'GREEDYDATA',
      ]);
    });

    it('processes zookeeper logs correctly', async () => {
      const zookeeperLogs = await getLogsFrom('Zookeeper');
      const nodes = await extractGrokPatternDangerouslySlow(zookeeperLogs);

      // 2015-07-29 17:41:44,747 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@774] - Notification time out: 3200

      expect(getGrokComponents(nodes)).toEqual([
        'TIMESTAMP_ISO8601',
        '\\s',
        '-',
        '\\s',
        'LOGLEVEL',
        '\\s+',
        '[',
        'DATA',
        '@',
        'INT',
        ']',
        '\\s',
        '-',
        '\\s',
        'GREEDYDATA',
      ]);
    });

    it('processes mac logs correctly', async () => {
      const macLogs = await getLogsFrom('Mac');
      const nodes = await extractGrokPatternDangerouslySlow(macLogs);

      // Jul  8 07:29:50 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 14:29:50 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
      // Jul  1 09:29:02 calvisitor-10-105-160-95 sandboxd[129] ([31211]): com.apple.Addres(31211) deny network-outbound /private/var/run/mDNSResponder

      expect(getGrokComponents(nodes)).toEqual([
        'SYSLOGTIMESTAMP',
        '\\s',
        'NOTSPACE',
        '\\s',
        'NOTSPACE',
        '\\s+',
        'GREEDYDATA',
      ]);
    });

    it('processes OpenStack logs correctly', async () => {
      const openstackLogs = await getLogsFrom('OpenStack');
      const nodes = await extractGrokPatternDangerouslySlow(openstackLogs);

      // nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.000 25746 INFO nova.osapi_compute.wsgi.server [req-38101a0b-2096-447d-96ea-a692162415ae 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2477829
      // nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.017 25746 INFO nova.osapi_compute.wsgi.server [req-9bc36dd9-91c5-4314-898a-47625eb93b09 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2577181
      // nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.104 25746 INFO nova.osapi_compute.wsgi.server [req-55db2d8d-cdb7-4b4b-993b-429be84c0c3e 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2731631
      // nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.122 25746 INFO nova.osapi_compute.wsgi.server [req-2a3dc421-6604-42a7-9390-a18dc824d5d6 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2580249
      // nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.208 25746 INFO nova.osapi_compute.wsgi.server [req-939eb332-c1c1-4e67-99b8-8695f8f1980a 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2727931

      expect(getGrokComponents(nodes)).toEqual([
        'WORD',
        '-',
        'WORD',
        '.',
        'WORD',
        '.',
        'INT',
        '.',
        'INT',
        '-',
        'INT',
        '-',
        'WORD',
        ':',
        'INT',
        ':',
        'INT',
        '\\s',
        'TIMESTAMP_ISO8601',
        '\\s',
        'INT',
        '\\s',
        'LOGLEVEL',
        '\\s',
        'NOTSPACE',
        '\\s',
        '[',
        'DATA',
        ']',
        '\\s',
        'GREEDYDATA',
      ]);
    });

    it('processes Proxifier logs correctly', async () => {
      const proxifierLogs = await getLogsFrom('Proxifier');
      const nodes = await extractGrokPatternDangerouslySlow(proxifierLogs);

      // [07.26 13:59:44] chrome.exe *64 - www.google.com.hk:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
      // [07.26 14:03:57] chrome.exe *64 - notifications.google.com:443 close, 470 bytes sent, 4856 bytes (4.74 KB) received, lifetime 04:00
      // [07.26 14:04:50] chrome.exe *64 - apis.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
      // [07.26 14:05:04] chrome.exe *64 - clients6.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
      // [07.26 14:05:07] Dropbox.exe - block.dropbox.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS

      expect(getGrokComponents(nodes)).toEqual([
        '[',
        'INT',
        '.',
        'INT',
        ' ',
        'INT',
        ':',
        'INT',
        ':',
        'INT',
        ']',
        '\\s',
        'DATA',
        '.',
        'WORD',
        '\\s',
        'GREEDYDATA',
      ]);
    });
  });
});
