/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractGrokPatternDangerouslySlow } from './extract_grok_pattern';
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
    // Real LogHub log lines (timestamps normalized to 2025-05-01), captured once from
    // @kbn/sample-log-parser and trimmed to the smallest set that still produces the same grok
    // structure as the full corpus. They used to be fetched at runtime, but that cloned the
    // external logpai/loghub repo on every run and made this suite flaky on any network hiccup
    // (https://github.com/elastic/kibana/issues/234038). When a heuristic change alters the
    // expected output, just update the expectations below; the sample lines only need
    // regenerating if the LogHub corpus or the list of systems changes.
    const LOGHUB_SAMPLES: Record<string, string[]> = {
      HealthApp: [
        '20250501-00:00:16:418|Step_SPUtils|30002312| getDiffTotalSteps= 1513958400215##0',
        '20250501-00:00:21:521|HiH_HiSyncControl|30002312|checkCurrentDay a new day comes , reset basicSyncCondition, currentDay is 20171224 oldDay is 20171223',
      ],
      Android: [
        '05-01 00:00:17.471 28601 28601 I AudioManager: abandonAudioFocus',
        '05-01 00:00:25.856  1702  2639 E ActivityManager: applyOptionsLocked: Unknown animationType=0',
      ],
      Thunderbird: [
        '- 1746057617 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 scsi0 : LSI Logic MegaRAID driver',
        '- 1746057625 2005.11.09 en14 Nov 9 12:15:06 en14/en14 smartd[1971]: Device: /dev/sda, Temperature changed -2 Celsius to 26 Celsius since last report',
      ],
      Zookeeper: [
        '2025-05-01 00:00:01,958 - INFO  [ProcessThread(sid:2 cport:-1)::PrepRequestProcessor@476] - Processed session termination for sessionid: 0x34ed9ac1c1e005e',
        '2025-05-01 00:00:02,084 - INFO  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:NIOServerCnxn@1001] - Closed socket connection for client /10.10.34.11:41160 which had sessionid 0x34ed9ac1c1e00a9',
        '2025-05-01 00:00:04,177 - INFO  [QuorumPeer[myid=3]/0:0:0:0:0:0:0:0:2181:Environment@100] - Server environment:java.home=/usr/lib/jvm/java-7-openjdk-amd64/jre',
      ],
      Mac: [
        'May 1 00:00:19 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.user.501): Service "com.apple.xpc.launchd.unmanaged.loginwindow.94" tried to hijack endpoint "com.apple.tsm.uiserver" from owner: com.apple.SystemUIServer.agent',
        'May 1 00:00:25 authorMacBook-Pro Mail[11203]: Unrecognized XSSimpleTypeDefinition: OneOff',
        'May 1 00:00:26 calvisitor-10-105-162-124 WeChat[24144]:     Arranged view frame: {{0, 0}, {260, 877}}',
      ],
      OpenStack: [
        'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:25.997 2931 INFO nova.virt.libvirt.driver [-] [instance: faf974ea-cba5-4e1b-93f4-3a3bc606006f] Instance spawned successfully.',
        'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:26.245 2931 INFO nova.compute.manager [req-699eeadf-6db8-44a4-8521-1ab4e8a53b53 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] [instance: faf974ea-cba5-4e1b-93f4-3a3bc606006f] Terminating instance',
        'nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:26.252 25746 INFO nova.osapi_compute.wsgi.server [req-dd237280-5bc8-41cb-a035-26c8e64d49fc 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1916 time: 0.2717581',
      ],
      Proxifier: [
        '[05.01 00:00:00] git-remote-https.exe - proxy.cse.cuhk.edu.hk:5070 close, 877 bytes sent, 3806 bytes (3.71 KB) received, lifetime 00:01',
        '[05.01 00:00:26] chrome.exe *64 - mhfm9.us.cdndm5.com:80 close, 0 bytes sent, 0 bytes received, lifetime 00:12',
      ],
    };

    function getLogsFrom(name: string): string[] {
      const messages = LOGHUB_SAMPLES[name];

      if (!messages) {
        throw new Error(`Could not find samples for ${name}`);
      }

      return messages;
    }

    it('processes HealthApp logs correctly', async () => {
      const healthAppLogs = getLogsFrom('HealthApp');
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
      const androidLogs = getLogsFrom('Android');
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
      const thunderbirdLogs = getLogsFrom('Thunderbird');
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
      const zookeeperLogs = getLogsFrom('Zookeeper');
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
      const macLogs = getLogsFrom('Mac');
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
      const openstackLogs = getLogsFrom('OpenStack');
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
      const proxifierLogs = getLogsFrom('Proxifier');
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
