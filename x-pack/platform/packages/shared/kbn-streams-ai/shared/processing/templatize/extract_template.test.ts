/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncExtractTemplate } from './extract_template';
import { androidLogs, macLogs, thunderbirdLogs, zookeeperLogs } from './sample_logs';

describe('extractTemplate', () => {
  it('processes android logs correctly', () => {
    const result = syncExtractTemplate(androidLogs);

    // 03-17 16:13:38.819  1702  8671 D PowerManagerService: acquire lock=233570404, flags=0x1, tag="View Lock", name=com.android.systemui, ws=null, uid=10037, pid=2227
    expect(result.root.formatted).toBe(
      '00-00\\s00:00:00.000\\s+(\\d{4,5})\\s+(\\d{4,5})\\s(D|V)\\s(WindowManager|PowerManagerService|TextView):\\s%{GREEDYDATA}'
    );
  });

  it('processes thunderbird logs correctly', () => {
    const result = syncExtractTemplate(thunderbirdLogs);

    // - 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root
    expect(result.root.formatted).toBe(
      '-\\s0000000000\\s0000.00.00\\s%{DATA}\\s%{MONTH}\\s0\\s00:00:00\\s%{DATA}\\s%{GREEDYDATA}'
    );
  });

  it('processes zookeeper logs correctly', () => {
    const result = syncExtractTemplate(zookeeperLogs);

    // 2015-07-29 17:41:44,747 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@774] - Notification time out: 3200
    expect(result.root.formatted).toBe(
      '0000-00-00\\s00:00:00,000\\s-\\s%{LOGLEVEL}\\s+[%{DATA}]\\s-\\s%{WORD}\\s%{WORD}\\s%{GREEDYDATA}'
    );
  });

  it('processes mac logs correctly', () => {
    const result = syncExtractTemplate(macLogs);

    // Jul  8 07:29:50 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 14:29:50 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
    expect(result.root.formatted).toBe('%{MONTH}\\s+0\\s00:00:00\\s%{GREEDYDATA}');
  });

  it('processes proxifier logs correctly', () => {
    const result = syncExtractTemplate(
      `[07.26 13:59:44] chrome.exe *64 - www.google.com.hk:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:03:57] chrome.exe *64 - notifications.google.com:443 close, 470 bytes sent, 4856 bytes (4.74 KB) received, lifetime 04:00
[07.26 14:04:50] chrome.exe *64 - apis.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:05:04] chrome.exe *64 - csi.gstatic.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:05:04] chrome.exe *64 - clients6.google.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:05:07] Dropbox.exe - block.dropbox.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:05:23] SogouCloud.exe - get.sogou.com:80 close, 759 bytes sent, 51462 bytes (50.2 KB) received, lifetime 00:05
[07.26 14:05:25] SogouCloud.exe - get.sogou.com:80 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:05:28] SogouCloud.exe - get.sogou.com:80 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:07:33] YodaoDict.exe - cidian.youdao.com:80 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS
[07.26 14:08:54] chrome.exe *64 - clientservices.googleapis.com:443 close, 1051 bytes (1.02 KB) sent, 592 bytes received, lifetime 04:01
[07.26 14:10:07] WeChat.exe - qbwup.imtt.qq.com:80 close, 494 bytes sent, 208 bytes received, lifetime 00:32
[07.26 14:10:59] WeChat.exe - short.weixin.qq.com:80 close, 425 bytes sent, 161 bytes received, lifetime <1 sec
[07.26 14:11:09] SGTool.exe - info.pinyin.sogou.com:80 close, 1020 bytes sent, 607 bytes received, lifetime 00:30
[07.26 14:11:25] Dropbox.exe - client-cf.dropbox.com:443 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS`.split(
        '\n'
      )
    );

    expect(result.root.formatted).toBe(
      '[00.00\\s00:00:00]\\s%{WORD}.(exe)\\s%{NOTSPACE}\\s%{DATA}\\s%{DATA}\\s%{DATA}\\s(through|470|proxy|bytes|1051)\\s%{GREEDYDATA}'
    );
  });

  it('generates a consistent root template structure', () => {
    // Test with a simple, consistent set of logs
    const simpleLogs = [
      '2023-05-30 12:34:56 INFO  Service started on port 8080',
      '2023-05-30 12:35:02 WARN  Service high memory usage: 85%',
      '2023-05-30 12:35:10 ERROR Service crashed with exit code 1',
    ];
    const result = syncExtractTemplate(simpleLogs);

    expect(result.root.formatted).toBe(
      '0000-00-00\\s00:00:00\\s%{LOGLEVEL}\\s+(Service)\\s(started|high|crashed)\\s(on|memory|with)\\s%{GREEDYDATA}'
    );
  });

  it('handles varying column counts across messages', () => {
    // Test with logs that have different numbers of columns
    const mixedLogs = [
      'App 123 started',
      'App 123 stopped with code 0',
      'App 123 error: connection refused',
    ];

    const result = syncExtractTemplate(mixedLogs);

    expect(result.root.formatted).toBe('(App)\\s000\\s%{GREEDYDATA}');
  });

  it('detects and handles special patterns correctly', () => {
    // Test with logs containing IP addresses, numbers, and other special patterns
    const specialLogs = [
      'Connection from 192.168.1.1 port 8080 established',
      'Connection from 10.0.0.254 port 443 established',
      'Connection from 172.16.0.1 port 22 established',
    ];

    const result = syncExtractTemplate(specialLogs);

    expect(result.root.formatted).toBe(
      '(Connection)\\s(from)\\s%{IPV4}\\s(port)\\s(\\d{2,4})\\s(established)'
    );
  });

  it('detects and handles quoted strings correctly', () => {
    const specialLogs = ['Foo "Quoted string"'];

    const result = syncExtractTemplate(specialLogs);

    expect(result.templates[0].columns.length).toBe(2);
  });
});
