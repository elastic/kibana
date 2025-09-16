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
    async function getLogsFrom(name: keyof typeof logsFixturesByGenerator) {
      const logs = logsFixturesByGenerator[name];

      if (!logs) {
        throw new Error(`Could not find logs for ${name}`);
      }

      return logs;
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

      // - 1131566503 2005.11.09 aadmin1 Nov 9 12:01:43 src@aadmin1 dhcpd: DHCPACK on 10.100.4.251 to 00:11:43:e3:ba:c3 via eth1

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

const logsFixturesByGenerator = {
  HealthApp: [
    '20250501-00:00:01:608|Step_LSC|30002312|flushTempCacheToDB by stand',
    '20250501-00:00:01:608|Step_LSC|30002312|Alarm uploadStaticsToDB totalSteps=7163Calories:153367Floor:240Distance:5112',
    '20250501-00:00:01:608|Step_FlushableStepDataCache|30002312|writeDataToDB size 327',
    '20250501-00:00:01:608|Step_FlushableStepDataCache|30002312|upLoadOneMinuteDataToEngine time=25233975,0,93,0,20002',
    '20250501-00:00:01:608|HiH_HiAppUtil|30002312|getBinderPackageName packageName = com.huawei.health',
    '20250501-00:00:01:608|HiH_HiHealthBinder|30002312|getAppContext() isAppValid health or wear, packageName = com.huawei.health',
    '20250501-00:00:01:608|HiH_HiHealthBinder|30002312|insertHiHealthData() checkAppType  0 appID = 1',
    '20250501-00:00:01:608|HiH_HiHealthDataInsertStore|30002312|saveHealthDetailData() deviceID = 2,clientID=1,id=1',
    '20250501-00:00:01:608|HiH_DataStatManager|30002312|new date =20171223, type=40002,7163.0,old=6983.0',
    '20250501-00:00:01:608|HiH_HiSyncControl|30002312|checkInsertStatus stepSum or calorieSum is enough',
    '20250501-00:00:01:609|Step_LSC|30002312|flush2DB result success',
  ],
  Android: [
    '05-01 00:00:02.592  1702  2105 D PowerManagerService: userActivityNoUpdateLocked: eventTime=261849942, event=2, flags=0x0, uid=1000',
    '05-01 00:00:02.593  1702  2105 D PowerManagerService: ready=true,policy=3,wakefulness=1,wksummary=0x0,uasummary=0x1,bootcompleted=true,boostinprogress=false,waitmodeenable=false,mode=false,manual=38,auto=-1,adj=0.0userId=0',
    '05-01 00:00:02.593  2227  2227 I PhoneStatusBar: suspendAutohide',
    '05-01 00:00:02.596  1702 14640 D WindowManager: interceptKeyTq keycode=4 interactive=true keyguardActive=false policyFlags=2b000002 down true canceled false',
    '05-01 00:00:02.596  1702 14640 D WindowManager: interceptKeyBeforeQueueing: key 4 , result : 1',
    '05-01 00:00:02.613  2227  2227 I PhoneStatusBar: resumeSuspendedAutohide',
    '05-01 00:00:02.614  2227  2318 V AudioManager: querySoundEffectsEnabled...',
    '05-01 00:00:02.622  1702  3697 D PowerManagerService: acquire lock=189667585, flags=0x1, tag="*launch*", name=android, ws=WorkSource{10113}, uid=1000, pid=1702',
    '05-01 00:00:02.622  1702  3697 D PowerManagerService: Acquiring suspend blocker "PowerManagerService.WakeLocks".',
    '05-01 00:00:02.631  2227  2227 I PhoneStatusBar: setSystemUiVisibility vis=508 mask=ffffffff oldVal=40000500 newVal=508 diff=40000008 fullscreenStackVis=0 dockedStackVis=0, fullscreenStackBounds=Rect(0, 0 - 720, 1280), dockedStackBounds=Rect(0, 0 - 0, 0)',
  ],
  Thunderbird: [
    '- 1746057600 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A8] datasource',
    '- 1746057600 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
    '- 1746057600 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
    '- 1746057600 2005.11.09 cn142 Nov 9 12:01:03 cn142/cn142 ntpd[7467]: synchronized to 10.100.20.250, stratum 3',
    '- 1746057600 2005.11.09 tbird-sm1 Nov 9 12:01:14 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
    '- 1746057637 2005.11.09 tbird-admin1 Nov 9 12:10:12 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: RRD_update (/var/lib/ganglia/rrds/D Nodes/dn731/pkts_out.rrd): illegal attempt to update using time 1131563412 when last update time is 1131563412 (minimum one second step)',
    '- 1746057640 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 megaraid cmm: #38#-rh1 (Release Date: Fri Dec 10 19:02:14 EST 2004)',
    '- 1746057600 2005.11.09 cn142 Nov 9 12:01:03 cn142/cn142 ntpd[7467]: synchronized to 10.100.20.250, stratum 3',
    '- 1746057600 2005.11.09 tbird-sm1 Nov 9 12:01:14 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
    '- 1746057637 2005.11.09 tbird-admin1 Nov 9 12:10:12 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: RRD_update (/var/lib/ganglia/rrds/D Nodes/dn731/pkts_out.rrd): illegal attempt to update using time 1131563412 when last update time is 1131563412 (minimum one second step)',
  ],
  Zookeeper: [
    '2025-05-01 00:00:00,000 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@774] - Notification time out: 3200',
    '2025-05-01 00:00:00,285 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.11:45307',
    '2025-05-01 00:00:00,317 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@762] - Connection broken for id 188978561024, my id = 1, error =',
    '2025-05-01 00:00:00,693 - INFO  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:ZooKeeperServer@839] - Client attempting to establish new session at /10.10.34.19:33425',
    '2025-05-01 00:00:00,807 - INFO  [CommitProcessor:1:ZooKeeperServer@595] - Established session 0x14ed93111f20027 with negotiated timeout 10000 for client /10.10.34.13:37177',
    '2025-05-01 00:00:04,998 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:Environment@100] - Server environment:user.dir=/',
    '2025-05-01 00:00:05,016 - WARN  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:ZooKeeperServer@793] - Connection request from old client /10.10.34.12:45728; will be dropped if server is in r-o mode',
    '2025-05-01 00:00:05,038 - WARN  [WorkerSender[myid=1]:QuorumCnxManager@368] - Cannot open channel to 2 at election address /10.10.34.12:3888',
    '2025-05-01 00:00:05,436 - WARN  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:NIOServerCnxn@349] - caught end of stream exception',
    '2025-05-01 00:00:05,437 - INFO  [ProcessThread(sid:1 cport:-1)::PrepRequestProcessor@476] - Processed session termination for sessionid: 0x14ede63a5a70023',
  ],
  Mac: [
    'May 1 00:00:00 authorMacBook-Pro kernel[0]: ARPT: 621799.252673: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0',
    "May 1 00:00:00 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 10602 seconds.  Ignoring.",
    'May 1 00:00:00 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED',
    'May 1 00:00:00 calvisitor-10-105-160-95 sandboxd[129] ([31376]): com.apple.Addres(31376) deny network-outbound /private/var/run/mDNSResponder',
    'May 1 00:00:00 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0',
    'May 1 00:00:00 calvisitor-10-105-160-95 sharingd[30299]: 10:46:47.425 : BTLE scanner Powered On',
    'May 1 00:00:00 calvisitor-10-105-160-95 QQ[10018]: button report: 0x8002be0',
    'May 1 00:00:00 calvisitor-10-105-160-95 sandboxd[129] ([31382]): com.apple.Addres(31382) deny network-outbound /private/var/run/mDNSResponder',
    'May 1 00:00:00 calvisitor-10-105-160-95 sharingd[30299]: 11:20:51.293 : BTLE discovered device with hash <01faa200 00000000 0000>',
    'May 1 00:00:00 calvisitor-10-105-160-95 secd[276]:  securityd_xpc_dictionary_handler cloudd[326] copy_matching Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}',
  ],
  OpenStack: [
    'nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.000 25746 INFO nova.osapi_compute.wsgi.server [req-38101a0b-2096-447d-96ea-a692162415ae 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1893 time: 0.2477829',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.349 2931 INFO nova.virt.libvirt.imagecache [req-addc1839-2ed5-4778-b57e-5854eb7b8b09 - - - - -] image 0673dd71-34c5-4fbb-86c4-40623fbe45b4 at (/var/lib/nova/instances/_base/a489c868f0c37da93b76227c91bb03908ac0e742): in use: on this node 1 local, 0 on other nodes sharing this instance storage',
    'nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.694 25743 INFO nova.api.openstack.compute.server_external_events [req-ab451068-9756-4ad9-9d18-5ceaa6424627 f7b8d1f1d4d44643b07fa10ca7d021fb e9746973ac574c6b8a9e8857f56a7608 - - -] Creating event network-vif-plugged:e3871ffd-5cd5-4287-bddd-3529f7b59515 for instance b9000564-fe1a-409b-b8cc-1e88b294cd1d',
    'nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.694 25743 INFO nova.osapi_compute.wsgi.server [req-ab451068-9756-4ad9-9d18-5ceaa6424627 f7b8d1f1d4d44643b07fa10ca7d021fb e9746973ac574c6b8a9e8857f56a7608 - - -] 10.11.10.1 "POST /v2/e9746973ac574c6b8a9e8857f56a7608/os-server-external-events HTTP/1.1" status: 200 len: 380 time: 0.0913219',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.695 2931 INFO nova.compute.manager [req-3ea4052c-895d-4b64-9e2d-04d64c4d94ab - - - - -] [instance: b9000564-fe1a-409b-b8cc-1e88b294cd1d] VM Resumed (Lifecycle Event)',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.695 2931 INFO nova.virt.libvirt.driver [-] [instance: b9000564-fe1a-409b-b8cc-1e88b294cd1d] Instance spawned successfully.',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.704 2931 INFO nova.virt.libvirt.imagecache [req-addc1839-2ed5-4778-b57e-5854eb7b8b09 - - - - -] image 0673dd71-34c5-4fbb-86c4-40623fbe45b4 at (/var/lib/nova/instances/_base/a489c868f0c37da93b76227c91bb03908ac0e742): in use: on this node 1 local, 0 on other nodes sharing this instance storage',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.707 2931 INFO nova.compute.manager [req-8e64797b-fb99-4c8a-87e5-9a8de673412f 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] [instance: b9000564-fe1a-409b-b8cc-1e88b294cd1d] Took 19.84 seconds to build instance.',
    'nova-api.log.1.2017-05-16_13:53:08 2025-05-01 00:00:00.759 25746 INFO nova.osapi_compute.wsgi.server [req-22455aab-13cf-4045-92e8-65371ef51485 113d3a99c3da401fbd62cc2caa5b96d2 54fadb412c4e40cdbaed9335e4c35a9e - - -] 10.11.10.1 "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1" status: 200 len: 1910 time: 0.2603891',
    'nova-compute.log.1.2017-05-16_13:55:31 2025-05-01 00:00:00.922 2931 INFO nova.compute.resource_tracker [req-addc1839-2ed5-4778-b57e-5854eb7b8b09 - - - - -] Auditing locally available compute resources for node cp-1.slowvm1.tcloud-pg0.utah.cloudlab.us',
  ],
  Proxifier: [
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:01',
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 403 bytes sent, 426 bytes received, lifetime <1 sec',
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    '[05.01 00:00:00] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    '[05.01 00:00:59] chrome.exe *64 - www.google.com.hk:443 close, 3443 bytes (3.36 KB) sent, 67897 bytes (66.3 KB) received, lifetime 04:01',
    '[05.01 00:00:59] git-remote-https.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    '[05.01 00:00:59] Dropbox.exe - client-cf.dropbox.com:443 close, 5129 bytes (5.00 KB) sent, 17049 bytes (16.6 KB) received, lifetime 01:01',
    '[05.01 00:00:59] chrome.exe *64 - mtalk.google.com:443 close, 985 bytes sent, 463 bytes received, lifetime 15:00',
  ],
};
