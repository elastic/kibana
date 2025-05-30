/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const androidLogs =
  `03-17 16:13:38.811  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false
03-17 16:13:38.819  1702  8671 D PowerManagerService: acquire lock=233570404, flags=0x1, tag="View Lock", name=com.android.systemui, ws=null, uid=10037, pid=2227
03-17 16:13:38.820  1702  8671 D PowerManagerService: ready=true,policy=3,wakefulness=1,wksummary=0x23,uasummary=0x1,bootcompleted=true,boostinprogress=false,waitmodeenable=false,mode=false,manual=38,auto=-1,adj=0.0userId=0
03-17 16:13:38.839  1702  2113 V WindowManager: Skipping AppWindowToken{df0798e token=Token{78af589 ActivityRecord{3b04890 u0 com.tencent.qt.qtl/com.tencent.video.player.activity.PlayerActivity t761}}} -- going to hide
03-17 16:13:38.859  2227  2227 D TextView: visible is system.time.showampm
03-17 16:13:38.861  2227  2227 D TextView: mVisiblity.getValue is false
03-17 16:13:38.869  2227  2227 D TextView: visible is system.charge.show
03-17 16:13:38.871  2227  2227 D TextView: mVisiblity.getValue is false
03-17 16:13:38.875  2227  2227 D TextView: visible is system.call.count gt 0
03-17 16:13:38.877  2227  2227 D TextView: mVisiblity.getValue is false
03-17 16:13:38.881  2227  2227 D TextView: visible is system.message.count gt 0
03-17 16:13:38.882  2227  2227 D TextView: mVisiblity.getValue is false
03-17 16:13:38.887  2227  2227 D TextView: visible is system.ownerinfo.show
03-17 16:13:38.888  2227  2227 D TextView: mVisiblity.getValue is false
03-17 16:13:38.905  1702 10454 D PowerManagerService: release:lock=233570404, flg=0x0, tag="View Lock", name=com.android.systemui", ws=null, uid=10037, pid=2227
03-17 16:13:38.905 11702  0454 D PowerManagerService: release:lock=233570404, flg=0x0, tag="View Lock", name=com.android.systemui", ws=null, uid=10037, pid=2227`.split(
    '\n'
  );

export const thunderbirdLogs =
  `- 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root
- 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root
- 1131566461 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root
- 1131566461 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root
- 1131566461 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root
- 1131566461 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root
- 1131566461 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root
- 1131566461 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root
- 1131566461 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root
- 1131566461 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root
- 1131566461 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root
- 1131566461 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root
- 1131566461 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root
- 1131566461 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)
- 1131566461 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)
- 1131566461 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A8] datasource
- 1131566461 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B8] datasource
- 1131566461 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource
- 1131566462 2005.11.09 #8# Nov 9 12:01:02 #8#/#8# crond(pam_unix)[23469]: session closed for user root
- 1131566462 2005.11.09 #8# Nov 9 12:01:02 #8#/#8# crond(pam_unix)[23469]: session opened for user root by (uid=0)
- 1131566462 2005.11.09 #8# Nov 9 12:01:02 #8#/#8# crond[23474]: (root) CMD (run-parts /etc/cron.hourly)`.split(
    '\n'
  );

export const zookeeperLogs =
  `2015-07-29 17:41:44,747 - INFO  [QuorumPeer[myid=1]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@774] - Notification time out: 3200
2015-07-29 19:04:12,394 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.11:45307
2015-07-29 19:04:29,071 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:04:29,079 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:13:17,524 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:13:24,282 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@762] - Connection broken for id 188978561024, my id = 1, error = 
2015-07-29 19:13:24,370 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.13:57707
2015-07-29 19:13:27,721 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@762] - Connection broken for id 188978561024, my id = 1, error = 
2015-07-29 19:13:34,382 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:13:37,626 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:13:44,301 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:13:47,731 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@762] - Connection broken for id 188978561024, my id = 1, error = 
2015-07-29 19:13:54,220 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.11:45382
2015-07-29 19:13:54,399 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@762] - Connection broken for id 188978561024, my id = 1, error = 
2015-07-29 19:14:04,406 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:14:07,559 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@765] - Interrupting SendWorker
2015-07-29 19:14:07,653 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:14:24,329 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@765] - Interrupting SendWorker
2015-07-29 19:14:37,585 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:14:44,256 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.11:45440
2015-07-29 19:14:47,593 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@765] - Interrupting SendWorker
2015-07-29 19:14:54,354 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:15:24,476 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:15:37,647 - WARN  [RecvWorker:188978561024:QuorumCnxManager$RecvWorker@765] - Interrupting SendWorker
2015-07-29 19:15:37,648 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@688] - Send worker leaving thread
2015-07-29 19:15:54,407 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue
2015-07-29 19:15:57,854 - INFO  [/10.10.34.11:3888:QuorumCnxManager$Listener@493] - Received connection request /10.10.34.13:57895`.split(
    '\n'
  );

export const macLogs =
  `Jul  1 09:00:55 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  1 09:01:05 calvisitor-10-105-160-95 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  1 09:01:06 calvisitor-10-105-160-95 QQ[10018]: FA||Url||taskID[2019352994] dealloc
Jul  1 09:02:26 calvisitor-10-105-160-95 kernel[0]: ARPT: 620701.011328: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  1 09:02:26 authorMacBook-Pro kernel[0]: ARPT: 620702.879952: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  1 09:03:11 calvisitor-10-105-160-95 mDNSResponder[91]: mDNS_DeregisterInterface: Frequent transitions for interface awdl0 (FE80:0000:0000:0000:D8A5:90FF:FEF5:7FFF)
Jul  1 09:03:13 calvisitor-10-105-160-95 kernel[0]: ARPT: 620749.901374: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  1 09:04:33 calvisitor-10-105-160-95 kernel[0]: ARPT: 620750.434035: wl0: wl_update_tcpkeep_seq: Original Seq: 3226706533, Ack: 3871687177, Win size: 4096
Jul  1 09:04:33 authorMacBook-Pro kernel[0]: ARPT: 620752.337198: ARPT: Wake Reason: Wake on Scan offload
Jul  1 09:04:37 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 09:12:20 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  1 09:12:21 calvisitor-10-105-160-95 symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 09:18:16 calvisitor-10-105-160-95 kernel[0]: ARPT: 620896.311264: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  1 09:19:03 calvisitor-10-105-160-95 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 09:19:03 authorMacBook-Pro configd[53]: setting hostname to "authorMacBook-Pro.local"
Jul  1 09:19:13 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 439034 seconds.  Ignoring.
Jul  1 09:21:57 authorMacBook-Pro corecaptured[31174]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  1 09:21:58 calvisitor-10-105-160-95 com.apple.WebKit.WebContent[25654]: [09:21:58.929] <<<< CRABS >>>> crabsFlumeHostAvailable: [0x7f961cf08cf0] Byte flume reports host available again.
Jul  1 09:22:02 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2450 seconds.  Ignoring.
Jul  1 09:22:25 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  1 09:23:26 calvisitor-10-105-160-95 kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  1 09:23:26 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  1 09:24:13 calvisitor-10-105-160-95 kernel[0]: PM response took 2010 ms (54, powerd)
Jul  1 09:25:21 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 438666 seconds.  Ignoring.
Jul  1 09:25:45 calvisitor-10-105-160-95 kernel[0]: ARPT: 621131.293163: wl0: Roamed or switched channel, reason #8, bssid 5c:50:15:4c:18:13, last RSSI -64
Jul  1 09:25:59 calvisitor-10-105-160-95 kernel[0]: ARPT: 621145.554555: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  1 09:26:41 calvisitor-10-105-160-95 kernel[0]: ARPT: 621146.080894: wl0: wl_update_tcpkeep_seq: Original Seq: 3014995849, Ack: 2590995288, Win size: 4096
Jul  1 09:26:43 calvisitor-10-105-160-95 networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x4 to 0x8000000000000000
Jul  1 09:26:47 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2165 seconds.  Ignoring.
Jul  1 09:27:01 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 13090 seconds.  Ignoring.
Jul  1 09:27:06 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  1 09:28:41 authorMacBook-Pro netbiosd[31198]: network_reachability_changed : network is not reachable, netbiosd is shutting down
Jul  1 09:28:41 authorMacBook-Pro corecaptured[31206]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  1 09:28:50 calvisitor-10-105-160-95 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  1 09:28:53 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2039 seconds.  Ignoring.
Jul  1 09:29:02 calvisitor-10-105-160-95 sandboxd[129] ([31211]): com.apple.Addres(31211) deny network-outbound /private/var/run/mDNSResponder
Jul  1 09:29:14 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  1 09:29:25 calvisitor-10-105-160-95 kernel[0]: ARPT: 621241.634070: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  1 09:31:48 authorMacBook-Pro kernel[0]: AirPort: Link Up on en0
Jul  1 09:31:53 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 438274 seconds.  Ignoring.
Jul  1 09:32:03 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1849 seconds.  Ignoring.
Jul  1 09:32:13 calvisitor-10-105-160-95 kernel[0]: Sandbox: com.apple.Addres(31229) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  1 09:32:28 calvisitor-10-105-160-95 mDNSResponder[91]: mDNS_DeregisterInterface: Frequent transitions for interface awdl0 (FE80:0000:0000:0000:D8A5:90FF:FEF5:7FFF)
Jul  1 09:33:13 calvisitor-10-105-160-95 kernel[0]: ARPT: 621342.242614: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  1 09:33:13 calvisitor-10-105-160-95 kernel[0]: AirPort: Link Up on awdl0
Jul  1 09:33:13 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 09:33:58 calvisitor-10-105-160-95 kernel[0]: ARPT: 621389.379319: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  1 09:34:42 calvisitor-10-105-160-95 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  1 09:34:52 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 438095 seconds.  Ignoring.
Jul  1 09:35:27 calvisitor-10-105-160-95 mDNSResponder[91]: mDNS_DeregisterInterface: Frequent transitions for interface en0 (2607:F140:6000:0008:C6B3:01FF:FECD:467F)
Jul  1 09:36:19 calvisitor-10-105-160-95 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 7
Jul  1 09:39:57 calvisitor-10-105-160-95 kernel[0]: ARPT: 621490.858770: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 2119064372, Ack 3325040593, Win size 278
Jul  1 09:39:57 calvisitor-10-105-160-95 kernel[0]: ARPT: 621490.890645: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  1 09:39:57 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  1 09:39:57 authorMacBook-Pro kernel[0]: ARPT: 621492.770239: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  1 09:41:34 calvisitor-10-105-160-95 kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  1 09:41:34 authorMacBook-Pro kernel[0]: ARPT: 621542.378462: ARPT: Wake Reason: Wake on Scan offload
Jul  1 09:41:34 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 09:41:44 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1268 seconds.  Ignoring.
Jul  1 09:41:44 calvisitor-10-105-160-95 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 12119 seconds.  Ignoring.
Jul  1 09:41:54 calvisitor-10-105-160-95 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  1 09:41:54 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 437673 seconds.  Ignoring.
Jul  1 09:42:16 calvisitor-10-105-160-95 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 12087 seconds.  Ignoring.
Jul  1 09:42:23 calvisitor-10-105-160-95 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  1 09:42:54 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  1 09:43:22 calvisitor-10-105-160-95 mDNSResponder[91]: mDNS_RegisterInterface: Frequent transitions for interface en0 (FE80:0000:0000:0000:C6B3:01FF:FECD:467F)
Jul  1 09:44:23 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  1 09:44:26 authorMacBook-Pro kernel[0]: AirPort: Link Up on en0
Jul  1 09:44:32 calvisitor-10-105-160-95 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  1 09:45:08 calvisitor-10-105-160-95 kernel[0]: ARPT: 621686.164365: wl0: setup_keepalive: Local port: 62614, Remote port: 443
Jul  1 09:45:46 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 09:45:52 calvisitor-10-105-160-95 networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x4 to 0x8000000000000000
Jul  1 09:59:26 calvisitor-10-105-160-95 kernel[0]: ARPT: 621738.114066: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  1 10:08:20 calvisitor-10-105-160-95 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-01 17:08:20 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  1 10:08:20 calvisitor-10-105-160-95 kernel[0]: en0: channel changed to 1
Jul  1 10:08:20 authorMacBook-Pro kernel[0]: ARPT: 621799.252673: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  1 10:08:21 authorMacBook-Pro corecaptured[31313]: CCFile::captureLog Received Capture notice id: 1498928900.759059, reason = AuthFail:sts:5_rsn:0
Jul  1 10:08:29 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 10602 seconds.  Ignoring.
Jul  1 10:08:49 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  1 10:08:55 calvisitor-10-105-160-95 AddressBookSourceSync[31318]: Unrecognized attribute value: t:AbchPersonItemType
Jul  1 10:09:58 calvisitor-10-105-160-95 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 10:10:24 calvisitor-10-105-160-95 kernel[0]: Sandbox: com.apple.Addres(31328) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  1 10:10:27 calvisitor-10-105-160-95 kernel[0]: Sandbox: com.apple.Addres(31328) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  1 10:13:39 calvisitor-10-105-160-95 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  1 10:13:43 calvisitor-10-105-160-95 SpotlightNetHelper[352]: CFPasteboardRef CFPasteboardCreate(CFAllocatorRef, CFStringRef) : failed to create global data
Jul  1 10:13:57 calvisitor-10-105-160-95 kernel[0]: Sandbox: com.apple.Addres(31346) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  1 10:38:53 calvisitor-10-105-160-95 sandboxd[129] ([31376]): com.apple.Addres(31376) deny network-outbound /private/var/run/mDNSResponder
Jul  1 10:46:47 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  1 10:46:47 calvisitor-10-105-160-95 sharingd[30299]: 10:46:47.425 : BTLE scanner Powered On
Jul  1 10:46:48 calvisitor-10-105-160-95 QQ[10018]: button report: 0x8002be0
Jul  1 10:47:08 calvisitor-10-105-160-95 sandboxd[129] ([31382]): com.apple.Addres(31382) deny network-outbound /private/var/run/mDNSResponder
Jul  1 11:20:51 calvisitor-10-105-160-95 sharingd[30299]: 11:20:51.293 : BTLE discovered device with hash <01faa200 00000000 0000>
Jul  1 11:24:45 calvisitor-10-105-160-95 secd[276]:  securityd_xpc_dictionary_handler cloudd[326] copy_matching Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  1 11:29:32 calvisitor-10-105-160-95 locationd[82]: Location icon should now be in state 'Inactive'
Jul  1 11:38:18 calvisitor-10-105-160-95 kernel[0]: ARPT: 626126.086205: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  1 11:38:18 calvisitor-10-105-160-95 kernel[0]: ARPT: 626126.086246: wl0: MDNS: IPV4 Addr: 10.105.160.95
Jul  1 11:39:47 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  1 11:39:47 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  1 11:39:48 authorMacBook-Pro kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  1 11:39:48 calvisitor-10-105-160-95 networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc19060 125.39.133.143:14000
Jul  1 11:39:48 calvisitor-10-105-160-95 kernel[0]: ARPT: 626132.740936: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  1 11:41:26 authorMacBook-Pro kernel[0]: Setting BTCoex Config: enable_2G:1, profile_2g:0, enable_5G:1, profile_5G:0
Jul  1 11:41:54 calvisitor-10-105-160-95 kernel[0]: Sandbox: com.apple.Addres(31432) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  1 11:41:55 calvisitor-10-105-160-95 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  1 11:43:08 authorMacBook-Pro UserEventAgent[43]: Captive: [CNInfoNetworkActive:1748] en0: SSID 'CalVisitor' making interface primary (cache indicates network not captive)
Jul  1 11:43:23 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 16227 seconds.  Ignoring.
Jul  1 11:44:20 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  1 11:44:25 authorMacBook-Pro kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  1 11:44:26 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from SUSPENDED to AUTO
Jul  1 11:46:16 calvisitor-10-105-160-95 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  1 11:46:16 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 11:46:19 authorMacBook-Pro sharingd[30299]: 11:46:19.229 : Finished generating hashes
Jul  1 11:46:21 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Evaluating
Jul  1 11:46:36 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 16034 seconds.  Ignoring.
Jul  1 11:46:48 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1277 seconds.  Ignoring.
Jul  1 11:47:56 authorMacBook-Pro kernel[0]: ARPT: 626380.467130: ARPT: Wake Reason: Wake on Scan offload
Jul  1 11:48:28 calvisitor-10-105-160-95 AddressBookSourceSync[31471]: Unrecognized attribute value: t:AbchPersonItemType
Jul  1 11:48:43 calvisitor-10-105-160-95 kernel[0]: PM response took 1938 ms (54, powerd)
Jul  1 11:49:29 calvisitor-10-105-160-95 QQ[10018]: tcp_connection_destination_perform_socket_connect 19110 connectx to 183.57.48.75:80@0 failed: [50] Network is down
Jul  1 11:49:29 calvisitor-10-105-160-95 kernel[0]: AirPort: Link Down on en0. Reason 8 (Disassociated because station leaving).
Jul  1 11:49:29 authorMacBook-Pro sharingd[30299]: 11:49:29.473 : BTLE scanner Powered On
Jul  1 11:49:29 authorMacBook-Pro kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  1 11:49:29 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 11:49:30 authorMacBook-Pro corecaptured[31480]: CCXPCService::setStreamEventHandler Registered for notification callback.
Jul  1 11:49:30 authorMacBook-Pro Dropbox[24019]: [0701/114930:WARNING:dns_config_service_posix.cc(306)] Failed to read DnsConfig.
Jul  1 11:49:35 calvisitor-10-105-160-95 cdpd[11807]: Saw change in network reachability (isReachable=2)
Jul  1 11:51:02 authorMacBook-Pro kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  1 11:51:07 authorMacBook-Pro kernel[0]: en0: BSSID changed to 5c:50:15:36:bc:03
Jul  1 11:51:11 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 15759 seconds.  Ignoring.
Jul  1 11:51:12 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4439 seconds.  Ignoring.
Jul  1 11:51:22 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4429 seconds.  Ignoring.
Jul  1 11:51:25 calvisitor-10-105-160-95 com.apple.AddressBook.InternetAccountsBridge[31496]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  1 11:53:45 calvisitor-10-105-160-95 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  1 11:53:45 authorMacBook-Pro kernel[0]: Setting BTCoex Config: enable_2G:1, profile_2g:0, enable_5G:1, profile_5G:0
Jul  1 11:53:49 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  1 11:55:14 calvisitor-10-105-160-95 kernel[0]: AirPort: Link Down on en0. Reason 8 (Disassociated because station leaving).
Jul  1 11:55:24 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4187 seconds.  Ignoring.
Jul  1 11:55:24 calvisitor-10-105-160-95 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4099 seconds.  Ignoring.
Jul  1 11:58:27 calvisitor-10-105-160-95 kernel[0]: ARPT: 626625.204595: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 3034132215, Ack 528237229, Win size 278
Jul  1 11:58:27 authorMacBook-Pro com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 15323 seconds.  Ignoring.
Jul  1 12:12:04 calvisitor-10-105-160-95 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 12:12:21 calvisitor-10-105-160-95 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  1 12:26:01 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 427826 seconds.  Ignoring.
Jul  1 12:26:01 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2350 seconds.  Ignoring.
Jul  1 12:39:29 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1542 seconds.  Ignoring.
Jul  1 12:39:55 calvisitor-10-105-160-95 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1428 seconds.  Ignoring.
Jul  1 12:52:57 calvisitor-10-105-160-95 kernel[0]: RTC: Maintenance 2017/7/1 19:52:56, sleep 2017/7/1 19:40:18
Jul  1 12:52:57 calvisitor-10-105-160-95 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  1 12:52:57 calvisitor-10-105-160-95 kernel[0]: en0: channel changed to 132,+1
Jul  1 12:53:53 calvisitor-10-105-160-95 kernel[0]: ARPT: 626908.045241: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  1 13:06:35 calvisitor-10-105-160-95 kernel[0]: AirPort: Link Up on awdl0
Jul  1 13:20:12 calvisitor-10-105-160-95 sharingd[30299]: 13:20:12.402 : BTLE scanner Powered On
Jul  1 13:20:12 calvisitor-10-105-160-95 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 424575 seconds.  Ignoring.
Jul  1 13:20:31 calvisitor-10-105-160-95 com.apple.AddressBook.InternetAccountsBridge[31588]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  1 13:20:33 calvisitor-10-105-160-95 sandboxd[129] ([31588]): com.apple.Addres(31588) deny network-outbound /private/var/run/mDNSResponder
Jul  1 13:34:07 calvisitor-10-105-160-95 com.apple.AddressBook.InternetAccountsBridge[31595]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  1 13:41:48 calvisitor-10-105-160-95 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  1 13:41:58 calvisitor-10-105-160-95 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  1 13:42:01 calvisitor-10-105-160-95 locationd[82]: Location icon should now be in state 'Active'
Jul  1 13:42:41 calvisitor-10-105-160-95 kernel[0]: ARPT: 627141.702095: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  1 13:44:07 calvisitor-10-105-160-95 com.apple.AddressBook.InternetAccountsBridge[31608]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  1 13:47:33 calvisitor-10-105-160-95 kernel[0]: en0: 802.11d country code set to 'X3'.
Jul  1 13:47:33 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  1 13:47:53 calvisitor-10-105-160-95 kernel[0]: en0: channel changed to 6
Jul  1 13:49:09 authorMacBook-Pro kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  1 14:01:24 calvisitor-10-105-160-95 kernel[0]: ARPT: 627305.613279: wl0: setup_keepalive: Seq: 1664112163, Ack: 818851215, Win size: 4096
Jul  1 14:14:51 calvisitor-10-105-160-95 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  1 14:28:27 calvisitor-10-105-160-95 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  1 14:28:55 calvisitor-10-105-160-95 kernel[0]: ARPT: 627355.597577: ARPT: Wake Reason: Wake on Scan offload
Jul  1 14:29:01 calvisitor-10-105-160-95 sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  1 14:38:45 calvisitor-10-105-160-95 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  1 14:52:03 calvisitor-10-105-160-95 kernel[0]: RTC: Maintenance 2017/7/1 21:52:00, sleep 2017/7/1 21:39:51
Jul  1 14:52:03 calvisitor-10-105-160-95 kernel[0]: [HID] [MT] AppleMultitouchDevice::willTerminate entered
Jul  1 14:52:03 calvisitor-10-105-160-95 blued[85]: [BluetoothHIDDeviceController] EventServiceDisconnectedCallback
Jul  1 15:05:42 calvisitor-10-105-160-95 kernel[0]: PMStats: Hibernate read took 197 ms
Jul  1 15:05:47 calvisitor-10-105-160-95 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  1 15:05:51 calvisitor-10-105-160-95 com.apple.AddressBook.InternetAccountsBridge[31654]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  1 19:43:22 calvisitor-10-105-160-95 kernel[0]: pages 1471315, wire 491253, act 449877, inact 3, cleaned 0 spec 5, zf 23, throt 0, compr 345876, xpmapped 40000
Jul  1 19:43:22 calvisitor-10-105-160-95 VDCAssistant[213]: VDCAssistant:  Found a camera (0x1430000005ac8290) , but was not able to start it up (0x0 -- (os/kern) successful)
Jul  1 19:43:22 calvisitor-10-105-160-95 WindowServer[184]: handle_will_sleep_auth_and_shield_windows: Reordering authw 0x7fa823a04400(2004) (lock state: 3)
Jul  1 19:43:32 calvisitor-10-105-163-202 symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  1 19:43:36 calvisitor-10-105-163-202 QQ[10018]: button report: 0x8002bdf
Jul  1 19:46:26 calvisitor-10-105-163-202 GoogleSoftwareUpdateAgent[31702]: 2017-07-01 19:46:26.133 GoogleSoftwareUpdateAgent[31702/0x7000002a0000] [lvl=2] -[KSAgentApp(KeystoneThread) runKeystonesInThreadWithArg:] Checking with local engine: <KSUpdateEngine:0x100259c60 ticketStore=<KSPersistentTicketStore:0x100253770 store=<KSKeyedPersistentStore:0x100254d10 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore" lockFile=<KSLockFile:0x100254d80 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore.lock" locked=NO > >> processor=<KSActionProcessor:0x100259e70 delegate=<KSUpdateEngine:0x100259c60> isProcessing=NO actionsCompleted=0 progress=0.00 errors=0 currentActionErrors=0 events=0 currentActionEvents=0 actionQueue=( ) > delegate=(null) serverInfoStore=<KSServerPrivateInfoStore:0x1002594d0 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/Servers"> errors=0 >
Jul  1 19:46:42 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  1 19:46:42 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9951303310>.
Jul  1 19:50:12 calvisitor-10-105-163-202 quicklookd[31687]: Error returned from iconservicesagent: (null)
Jul  1 20:13:23 calvisitor-10-105-163-202 Safari[9852]: tcp_connection_tls_session_error_callback_imp 1977 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  1 20:17:07 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9951105bf0>.
Jul  1 20:17:08 calvisitor-10-105-163-202 quicklookd[31687]: Error returned from iconservicesagent: (null)
Jul  1 20:23:09 calvisitor-10-105-163-202 cloudd[326]:  SecOSStatusWith error:[-50] Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  1 21:03:00 calvisitor-10-105-163-202 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  1 21:10:19 calvisitor-10-105-163-202 Preview[11512]: WARNING: Type1 font data isn't in the correct format required by the Adobe Type 1 Font Format specification.
Jul  1 21:17:32 calvisitor-10-105-163-202 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  1 21:18:10 calvisitor-10-105-163-202 quicklookd[31687]: Error returned from iconservicesagent: (null)
Jul  1 21:18:10 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  1 21:19:06 calvisitor-10-105-163-202 quicklookd[31687]: Error returned from iconservicesagent: (null)
Jul  1 21:21:33 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  1 21:24:38 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9951005740>.
Jul  1 21:33:23 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950606790>.
Jul  1 22:03:31 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.ical.sync.x-coredata://DB05755C-483D-44B7-B93B-ED06E57FF420/CalDAVPrincipal/p11: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 59 seconds.  Ignoring.
Jul  1 22:08:16 calvisitor-10-105-163-202 WindowServer[184]: device_generate_desktop_screenshot: authw 0x7fa823c89600(2000), shield 0x7fa8258cac00(2001)
Jul  1 22:12:41 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950606790>.
Jul  1 22:13:49 calvisitor-10-105-163-202 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  1 22:19:34 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950606790>.
Jul  1 22:20:14 calvisitor-10-105-163-202 WindowServer[184]: device_generate_desktop_screenshot: authw 0x7fa823c89600(2000), shield 0x7fa8258cac00(2001)
Jul  1 22:20:57 calvisitor-10-105-163-202 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  1 22:20:58 calvisitor-10-105-163-202 quicklookd[31687]: Error returned from iconservicesagent: (null)
Jul  1 22:22:59 calvisitor-10-105-163-202 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.coredav] [Refusing to parse response to PROPPATCH because of content-type: [text/html; charset=UTF-8].]
Jul  1 22:25:38 calvisitor-10-105-163-202 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 250, items, fQueryRetries, 0, fLastRetryTimestamp, 520665636.6
Jul  1 22:30:15 calvisitor-10-105-163-202 QQ[10018]: button report: 0x8002bdf
Jul  1 23:32:34 calvisitor-10-105-163-202 kernel[0]: ARPT: 640362.070027: wl0: wl_update_tcpkeep_seq: Original Seq: 2000710617, Ack: 2120985509, Win size: 4096
Jul  1 23:32:34 calvisitor-10-105-163-202 kernel[0]: Previous sleep cause: 5
Jul  1 23:32:34 calvisitor-10-105-163-202 kernel[0]: AirPort: Link Up on awdl0
Jul  1 23:46:06 calvisitor-10-105-163-202 kernel[0]: Wake reason: RTC (Alarm)
Jul  1 23:46:06 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 2 us
Jul  1 23:46:06 calvisitor-10-105-163-202 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  2 02:18:39 calvisitor-10-105-163-202 sharingd[30299]: 02:18:39.156 : BTLE scanner Powered On
Jul  2 02:18:39 calvisitor-10-105-163-202 configd[53]: network changed: v4(en0-:10.105.163.202) v6(en0:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  2 02:19:03 calvisitor-10-105-163-202 com.apple.AddressBook.InternetAccountsBridge[31953]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  2 02:32:17 calvisitor-10-105-163-202 kernel[0]: hibernate_page_list_setall found pageCount 448015
Jul  2 02:32:17 calvisitor-10-105-163-202 kernel[0]: [HID] [ATC] [Error] AppleDeviceManagementHIDEventService::start Could not make a string from out connection notification key
Jul  2 02:32:17 calvisitor-10-105-163-202 kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:1c
Jul  2 02:32:17 calvisitor-10-105-163-202 kernel[0]: [IOBluetoothFamily][staticBluetoothTransportShowsUp] -- Received Bluetooth Controller register service notification -- 0x7000
Jul  2 10:11:17 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  2 10:20:52 calvisitor-10-105-163-202 QQ[10018]: FA||Url||taskID[2019353117] dealloc
Jul  2 10:27:44 calvisitor-10-105-163-202 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 250, items, fQueryRetries, 0, fLastRetryTimestamp, 520708962.7
Jul  2 10:40:07 calvisitor-10-105-163-202 GoogleSoftwareUpdateAgent[32012]: 2017-07-02 10:40:07.676 GoogleSoftwareUpdateAgent[32012/0x7000002a0000] [lvl=2] -[KSAgentApp updateProductWithProductID:usingEngine:] Checking for updates for "com.google.Keystone" using engine <KSUpdateEngine:0x100313e70 ticketStore=<KSPersistentTicketStore:0x100332a60 store=<KSKeyedPersistentStore:0x100315fa0 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore" lockFile=<KSLockFile:0x1003176d0 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore.lock" locked=NO > >> processor=<KSActionProcessor:0x1003143e0 delegate=<KSUpdateEngine:0x100313e70> isProcessing=NO actionsCompleted=0 progress=0.00 errors=0 currentActionErrors=0 events=0 currentActionEvents=0 actionQueue=( ) > delegate=(null) serverInfoStore=<KSServerPrivateInfoStore:0x100311a10 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/Servers"> errors=0 >
Jul  2 11:38:49 calvisitor-10-105-163-202 QQ[10018]: 2017/07/02 11:38:49.414 | I | VoipWrapper  | DAVEngineImpl.cpp:1400:Close             | close video chat. llFriendUIN = ******2341.
Jul  2 11:39:07 calvisitor-10-105-163-202 kernel[0]: ARPT: 645791.413780: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 156,
Jul  2 11:42:54 calvisitor-10-105-163-202 kernel[0]: Previous sleep cause: 5
Jul  2 11:42:54 calvisitor-10-105-163-202 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  2 11:42:55 authorMacBook-Pro kernel[0]: ARPT: 645795.024045: ARPT: Wake Reason: Wake on Scan offload
Jul  2 11:43:53 calvisitor-10-105-163-202 kernel[0]: PM response took 28003 ms (54, powerd)
Jul  2 12:15:23 calvisitor-10-105-163-202 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  2 12:15:23 calvisitor-10-105-163-202 sharingd[30299]: 12:15:23.005 : Discoverable mode changed to Off
Jul  2 12:15:24 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 19617 failed: 3 - No network route
Jul  2 12:15:30 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Authenticated
Jul  2 12:29:56 calvisitor-10-105-163-202 kernel[0]: ARPT: 645957.322055: wl0: setup_keepalive: Local IP: 10.105.163.202
Jul  2 12:43:24 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 12:56:19 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 4
Jul  2 13:00:07 calvisitor-10-105-163-202 kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  2 13:01:36 calvisitor-10-105-163-202 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 13:01:37 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  2 13:02:03 calvisitor-10-105-163-202 com.apple.AddressBook.InternetAccountsBridge[32155]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  2 13:03:10 calvisitor-10-105-163-202 kernel[0]: Previous sleep cause: 5
Jul  2 13:03:10 authorMacBook-Pro kernel[0]: ARPT: 646193.687729: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  2 13:03:41 calvisitor-10-105-163-202 AddressBookSourceSync[32160]: Unrecognized attribute value: t:AbchPersonItemType
Jul  2 13:05:38 calvisitor-10-105-163-202 kernel[0]: TBT W (2): 0x0040 [x]
Jul  2 13:05:40 authorMacBook-Pro configd[53]: network changed: DNS* Proxy
Jul  2 13:06:17 calvisitor-10-105-163-202 kernel[0]: ARPT: 646292.668059: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  2 13:10:47 calvisitor-10-105-163-202 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  2 13:12:08 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  2 13:12:08 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  2 13:12:41 calvisitor-10-105-163-202 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  2 13:13:22 authorMacBook-Pro mDNSResponder[91]: mDNS_RegisterInterface: Frequent transitions for interface awdl0 (FE80:0000:0000:0000:D8A5:90FF:FEF5:7FFF)
Jul  2 13:44:22 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  2 13:44:30 authorMacBook-Pro sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  2 13:44:55 calvisitor-10-105-163-202 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  2 13:45:01 calvisitor-10-105-163-202 com.apple.AddressBook.InternetAccountsBridge[32208]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  2 13:56:23 calvisitor-10-105-163-202 kernel[0]: ARPT: 646509.760609: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  2 14:07:52 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 14:33:03 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Inactive'
Jul  2 14:41:07 calvisitor-10-105-163-202 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2044 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  2 14:44:01 calvisitor-10-105-163-202 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  2 14:52:57 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 15:06:24 calvisitor-10-105-163-202 syslogd[44]: ASL Sender Statistics
Jul  2 15:33:55 calvisitor-10-105-163-202 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000300
Jul  2 15:34:11 calvisitor-10-105-163-202 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  2 15:46:40 calvisitor-10-105-163-202 GoogleSoftwareUpdateAgent[32432]: 2017-07-02 15:46:40.516 GoogleSoftwareUpdateAgent[32432/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher(PrivateMethods) launchedHelperTaskForToolPath:error:] KSOutOfProcessFetcher launched '/Users/xpc/Library/Google/GoogleSoftwareUpdate/GoogleSoftwareUpdate.bundle/Contents/MacOS/ksfetch' with process id: 32433
Jul  2 15:46:40 calvisitor-10-105-163-202 GoogleSoftwareUpdateAgent[32432]: 2017-07-02 15:46:40.697 GoogleSoftwareUpdateAgent[32432/0x7000002a0000] [lvl=2] -[KSUpdateEngine updateAllExceptProduct:] KSUpdateEngine updating all installed products, except:'com.google.Keystone'.
Jul  2 15:46:41 calvisitor-10-105-163-202 ksfetch[32435]: 2017-07-02 15:46:41.445 ksfetch[32435/0x7fff79824000] [lvl=2] main() ksfetch fetching URL (<NSMutableURLRequest: 0x1005110b0> { URL: https://tools.google.com/service/update2?cup2hreq=53f725cf03f511fab16f19e789ce64aa1eed72395fc246e9f1100748325002f4&cup2key=7:1132320327 }) to folder:/tmp/KSOutOfProcessFetcher.YH2CjY1tnx/download
Jul  2 16:38:07 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Inactive'
Jul  2 16:51:10 calvisitor-10-105-163-202 QQ[10018]: FA||Url||taskID[2019353182] dealloc
Jul  2 16:55:53 calvisitor-10-105-163-202 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.32502): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SearchHelper.xpc/Contents/MacOS/com.apple.Safari.SearchHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  2 17:01:19 calvisitor-10-105-163-202 cloudd[326]:  SecOSStatusWith error:[-50] Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  2 17:07:56 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 17:11:18 calvisitor-10-105-163-202 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2068 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  2 17:13:46 calvisitor-10-105-163-202 com.apple.WebKit.WebContent[32514]: [17:13:46.390] <<<< IQ-CA >>>> piqca_setUsePreQueue: (0x7f92413e3000) rejecting report of layer being serviced - IQ has not yet begun to update
Jul  2 17:19:15 calvisitor-10-105-163-202 com.apple.WebKit.WebContent[32514]: [17:19:15.148] itemasync_SetProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2306
Jul  2 17:34:21 calvisitor-10-105-163-202 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  2 17:36:15 calvisitor-10-105-163-202 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  2 17:39:27 calvisitor-10-105-163-202 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.32564): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.WebFeedParser.xpc/Contents/MacOS/com.apple.Safari.WebFeedParser error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  2 17:44:05 calvisitor-10-105-163-202 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  2 17:56:40 calvisitor-10-105-163-202 com.apple.ncplugin.WorldClock[32583]: host connection <NSXPCConnection: 0x7fddbbb015c0> connection from pid 30298 invalidated
Jul  2 17:56:40 calvisitor-10-105-163-202 com.apple.ncplugin.weather[32585]: Error in CoreDragRemoveReceiveHandler: -1856
Jul  2 18:08:55 calvisitor-10-105-163-202 kernel[0]: ARPT: 661549.802297: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  2 18:08:55 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  2 18:08:56 authorMacBook-Pro kernel[0]: ARPT: 661552.832561: IOPMPowerSource Information: onWake,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  2 18:09:15 calvisitor-10-105-163-202 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  2 18:23:33 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 18:35:12 calvisitor-10-105-163-202 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 18:35:12 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 18:35:13 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  2 18:35:23 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 49 seconds.  Ignoring.
Jul  2 18:35:44 calvisitor-10-105-163-202 sandboxd[129] ([32626]): com.apple.Addres(32626) deny network-outbound /private/var/run/mDNSResponder
Jul  2 18:35:57 calvisitor-10-105-163-202 kernel[0]: ARPT: 661708.530713: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  2 18:36:01 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  2 18:37:25 authorMacBook-Pro configd[53]: network changed: v4(en0-:10.105.163.202) v6(en0:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  2 18:38:31 authorMacBook-Pro com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2262 seconds.  Ignoring.
Jul  2 18:38:31 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Inactive
Jul  2 18:38:32 authorMacBook-Pro corecaptured[32639]: CCXPCService::setStreamEventHandler Registered for notification callback.
Jul  2 18:38:36 calvisitor-10-105-163-202 kernel[0]: Setting BTCoex Config: enable_2G:1, profile_2g:0, enable_5G:1, profile_5G:0
Jul  2 18:39:18 calvisitor-10-105-163-202 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 18:40:01 authorMacBook-Pro kernel[0]: in6_unlink_ifa: IPv6 address 0x77c9114551ab23ab has no prefix
Jul  2 18:40:08 calvisitor-10-105-163-202 configd[53]: network changed: v4(en0:10.105.163.202) v6(en0+:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  2 18:40:21 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 318966 seconds.  Ignoring.
Jul  2 18:40:40 calvisitor-10-105-163-202 com.apple.AddressBook.InternetAccountsBridge[32655]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  2 18:40:46 calvisitor-10-105-163-202 kernel[0]: ARPT: 661856.313502: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  2 18:53:41 calvisitor-10-105-163-202 kernel[0]: en0: BSSID changed to 5c:50:15:36:bc:03
Jul  2 18:53:41 calvisitor-10-105-163-202 kernel[0]: en0: channel changed to 6
Jul  2 18:53:51 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 318156 seconds.  Ignoring.
Jul  2 18:54:02 calvisitor-10-105-163-202 com.apple.AddressBook.InternetAccountsBridge[32662]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  2 18:54:36 calvisitor-10-105-163-202 kernel[0]: ARPT: 661915.168735: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:4de9:a101:c96c:f28b
Jul  2 19:21:05 calvisitor-10-105-163-202 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  2 19:21:15 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 3498 seconds.  Ignoring.
Jul  2 19:34:33 calvisitor-10-105-163-202 com.apple.geod[30311]: PBRequester failed with Error Error Domain=NSURLErrorDomain Code=-1001 "The request timed out." UserInfo={NSUnderlyingError=0x7fe133460660 {Error Domain=kCFErrorDomainCFNetwork Code=-1001 "The request timed out." UserInfo={NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorCodeKey=-2102, _kCFStreamErrorDomainKey=4, NSLocalizedDescription=The request timed out.}}, NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorDomainKey=4, _kCFStreamErrorCodeKey=-2102, NSLocalizedDescription=The request timed out.}
Jul  2 19:35:29 calvisitor-10-105-163-202 kernel[0]: ARPT: 662096.028575: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:4de9:a101:c96c:f28b
Jul  2 19:35:32 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  2 19:48:11 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 314896 seconds.  Ignoring.
Jul  2 19:48:20 calvisitor-10-105-163-202 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 106 seconds.  Ignoring.
Jul  2 19:48:30 calvisitor-10-105-163-202 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  2 20:01:48 calvisitor-10-105-163-202 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  2 20:01:48 calvisitor-10-105-163-202 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 5
Jul  2 20:01:48 calvisitor-10-105-163-202 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-03 03:01:48 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  2 20:01:59 calvisitor-10-105-163-202 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 61304 seconds.  Ignoring.
Jul  2 20:15:26 calvisitor-10-105-163-202 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  2 20:15:26 calvisitor-10-105-163-202 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  2 20:22:06 calvisitor-10-105-163-202 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-03 03:22:06 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  2 20:22:38 calvisitor-10-105-163-202 WindowServer[184]: device_generate_lock_screen_screenshot: authw 0x7fa823962400(2000)[0, 0, 1440, 900] shield 0x7fa82d372000(2001), dev [1440,900]
Jul  2 20:43:36 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Active'
Jul  2 20:50:47 calvisitor-10-105-163-202 ksfetch[32776]: 2017-07-02 20:50:47.457 ksfetch[32776/0x7fff79824000] [lvl=2] KSHelperReceiveAllData() KSHelperTool read 1926 bytes from stdin.
Jul  2 21:17:07 calvisitor-10-105-163-202 com.apple.WebKit.WebContent[32778]: [21:17:07.529] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  2 21:43:56 calvisitor-10-105-163-202 locationd[82]: Location icon should now be in state 'Inactive'
Jul  2 21:44:16 calvisitor-10-105-163-202 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2103 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  2 21:46:49 calvisitor-10-105-163-202 syslogd[44]: ASL Sender Statistics
Jul  2 21:48:53 calvisitor-10-105-163-202 sharingd[30299]: 21:48:53.041 : BTLE scanner Powered Off
Jul  2 22:09:17 calvisitor-10-105-163-202 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  2 22:24:03 authorMacBook-Pro com.apple.geod[30311]: PBRequester failed with Error Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline." UserInfo={NSUnderlyingError=0x7fe13512cf70 {Error Domain=kCFErrorDomainCFNetwork Code=-1009 "The Internet connection appears to be offline." UserInfo={NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorCodeKey=8, _kCFStreamErrorDomainKey=12, NSLocalizedDescription=The Internet connection appears to be offline.}}, NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorDomainKey=12, _kCFStreamErrorCodeKey=8, NSLocalizedDescription=The Internet connection appears to be offline.}
Jul  2 22:24:03 authorMacBook-Pro kernel[0]: ARPT: 669592.164786: AQM agg params 0xfc0 maxlen hi/lo 0x0 0xffff minlen 0x0 adjlen 0x0
Jul  2 22:24:04 authorMacBook-Pro corecaptured[32877]: Received Capture Event
Jul  2 22:24:14 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Evaluating
Jul  2 22:24:15 authorMacBook-Pro kernel[0]: Sandbox: QQ(10018) deny(1) mach-lookup com.apple.networking.captivenetworksupport
Jul  2 22:24:18 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[32885]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  2 22:24:25 authorMacBook-Pro kernel[0]: Sandbox: com.apple.Addres(32885) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  2 22:24:43 authorMacBook-Pro corecaptured[32877]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  2 22:32:34 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [22:32:34.846] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  2 22:44:55 authorMacBook-Pro locationd[82]: Location icon should now be in state 'Active'
Jul  2 23:21:43 authorMacBook-Pro kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  2 23:22:08 authorMacBook-Pro kernel[0]: ARPT: 671682.028482: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  2 23:22:10 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 23:35:17 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 2 us
Jul  2 23:35:17 authorMacBook-Pro kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  2 23:35:17 authorMacBook-Pro syslogd[44]: ASL Sender Statistics
Jul  2 23:35:17 authorMacBook-Pro kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  2 23:35:21 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  2 23:48:54 authorMacBook-Pro secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  3 00:02:22 authorMacBook-Pro kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  3 00:02:22 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 00:02:27 authorMacBook-Pro Safari[9852]: tcp_connection_tls_session_error_callback_imp 2115 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  3 00:27:35 authorMacBook-Pro ntpd[207]: sigio_handler: sigio_handler_active != 0
Jul  3 00:27:54 authorMacBook-Pro QQ[10018]: ############################## _getSysMsgList
Jul  3 00:41:11 authorMacBook-Pro syslogd[44]: Configuration Notice: ASL Module "com.apple.performance" claims selected messages. Those messages may not appear in standard system log files or in the ASL database.
Jul  3 00:55:12 authorMacBook-Pro kernel[0]: ARPT: 671856.784669: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 18011,
Jul  3 01:06:37 authorMacBook-Pro kernel[0]: Wake reason: ?
Jul  3 01:06:37 authorMacBook-Pro kernel[0]: en0: channel changed to 132,+1
Jul  3 01:06:37 authorMacBook-Pro sharingd[30299]: 01:06:37.436 : Scanning mode Contacts Only
Jul  3 01:06:37 authorMacBook-Pro kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  3 01:06:48 authorMacBook-Pro com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  3 01:07:08 authorMacBook-Pro kernel[0]: ARPT: 671889.268467: wl0: setup_keepalive: Seq: 2040703749, Ack: 3006590414, Win size: 4096
Jul  3 01:31:00 authorMacBook-Pro kernel[0]: ARPT: 671958.142550: wl0: setup_keepalive: Local port: 49791, Remote port: 5223
Jul  3 01:42:26 authorMacBook-Pro sharingd[30299]: 01:42:26.004 : BTLE scanning stopped
Jul  3 01:54:51 authorMacBook-Pro sandboxd[129] ([32992]): com.apple.Addres(32992) deny network-outbound /private/var/run/mDNSResponder
Jul  3 01:58:00 authorMacBook-Pro ntpd[207]: wake time set +0.270003 s
Jul  3 01:58:04 authorMacBook-Pro kernel[0]: ARPT: 672041.595629: wl0: setup_keepalive: interval 258, retry_interval 30, retry_count 10
Jul  3 02:07:59 authorMacBook-Pro kernel[0]: Previous sleep cause: 5
Jul  3 02:07:59 authorMacBook-Pro hidd[98]: [HID] [MT] MTActuatorManagement::getActuatorRef Calling MTActuatorOpen() outside of MTTrackpadHIDManager.
Jul  3 02:08:34 authorMacBook-Pro kernel[0]: ARPT: 672113.005012: wl0: setup_keepalive: interval 258, retry_interval 30, retry_count 10
Jul  3 02:08:34 authorMacBook-Pro kernel[0]: ARPT: 672113.005034: wl0: setup_keepalive: Seq: 1128495564, Ack: 3106452487, Win size: 4096
Jul  3 02:19:59 authorMacBook-Pro kernel[0]: ARPT: 672115.511090: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  3 02:20:05 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000300
Jul  3 02:32:01 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-03 09:32:01 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  3 03:07:51 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 03:07:55 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 03:31:43 authorMacBook-Pro sharingd[30299]: 03:31:43.005 : BTLE scanning stopped
Jul  3 03:31:43 authorMacBook-Pro kernel[0]: in6_unlink_ifa: IPv6 address 0x77c9114551ab225b has no prefix
Jul  3 03:31:43 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  3 03:43:40 authorMacBook-Pro kernel[0]: Previous sleep cause: 5
Jul  3 03:43:40 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  3 03:44:10 authorMacBook-Pro kernel[0]: ARPT: 672405.912863: wl0: MDNS: IPV6 Addr: 2607:f140:400:a01b:c6b3:1ff:fecd:467f
Jul  3 03:55:39 authorMacBook-Pro locationd[82]: NETWORK: requery, 0, 0, 0, 0, 252, items, fQueryRetries, 0, fLastRetryTimestamp, 520765684.9
Jul  3 03:55:49 authorMacBook-Pro locationd[82]: Location icon should now be in state 'Inactive'
Jul  3 03:56:18 authorMacBook-Pro mDNSResponder[91]: mDNS_DeregisterInterface: Frequent transitions for interface en0 (10.142.110.44)
Jul  3 04:08:14 authorMacBook-Pro kernel[0]: ARPT: 672487.663921: wl0: MDNS: IPV6 Addr: 2607:f140:400:a01b:c6b3:1ff:fecd:467f
Jul  3 04:19:59 authorMacBook-Pro sandboxd[129] ([33047]): com.apple.Addres(33047) deny network-outbound /private/var/run/mDNSResponder
Jul  3 04:31:30 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 04:31:31 authorMacBook-Pro ntpd[207]: wake time set -0.331349 s
Jul  3 04:43:26 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  3 04:43:49 authorMacBook-Pro sandboxd[129] ([33056]): com.apple.Addres(33056) deny network-outbound /private/var/run/mDNSResponder
Jul  3 04:55:22 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 04:55:22 authorMacBook-Pro kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  3 05:07:13 authorMacBook-Pro kernel[0]: en0: channel changed to 132,+1
Jul  3 05:19:07 authorMacBook-Pro kernel[0]: ARPT: 672663.206073: wl0: wl_update_tcpkeep_seq: Original Seq: 2185760336, Ack: 2085655440, Win size: 4096
Jul  3 05:30:59 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 5
Jul  3 05:31:00 authorMacBook-Pro QQ[10018]: button report: 0x80039B7
Jul  3 05:31:03 authorMacBook-Pro kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  3 05:33:53 authorMacBook-Pro kernel[0]: ARPT: 672735.825491: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  3 05:33:53 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 6
Jul  3 05:57:59 authorMacBook-Pro com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  3 05:58:10 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[33109]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  3 06:09:46 authorMacBook-Pro ntpd[207]: sigio_handler: sigio_handler_active != 0
Jul  3 06:09:56 authorMacBook-Pro com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  3 06:22:02 authorMacBook-Pro kernel[0]: Sandbox: com.apple.Addres(33119) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  3 06:22:20 authorMacBook-Pro kernel[0]: ARPT: 672922.026642: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  3 06:33:47 authorMacBook-Pro kernel[0]: ARPT: 672925.537944: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  3 06:33:47 authorMacBook-Pro kernel[0]: ARPT: 672925.539048: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  3 06:33:47 authorMacBook-Pro kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  3 06:45:42 authorMacBook-Pro kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  3 06:45:43 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 06:46:03 authorMacBook-Pro com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  3 06:46:24 authorMacBook-Pro kernel[0]: ARPT: 673002.849007: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  3 06:57:52 authorMacBook-Pro kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  3 06:57:52 authorMacBook-Pro sharingd[30299]: 06:57:52.002 : Purged contact hashes
Jul  3 07:09:47 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 07:10:10 authorMacBook-Pro sandboxd[129] ([33139]): com.apple.Addres(33139) deny network-outbound /private/var/run/mDNSResponder
Jul  3 07:10:13 authorMacBook-Pro sandboxd[129] ([33139]): com.apple.Addres(33139) deny network-outbound /private/var/run/mDNSResponder
Jul  3 07:21:45 authorMacBook-Pro kernel[0]: ARPT: 673078.174655: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  3 07:33:34 authorMacBook-Pro kernel[0]: ARPT: 673110.784021: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 4039579370, Ack 2406464715, Win size 278
Jul  3 07:33:34 authorMacBook-Pro kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  3 07:33:34 authorMacBook-Pro sharingd[30299]: 07:33:34.878 : BTLE scanning started
Jul  3 07:33:34 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 07:33:35 authorMacBook-Pro kernel[0]: IOPMrootDomain: idle cancel, state 1
Jul  3 07:45:34 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  3 07:45:55 authorMacBook-Pro com.apple.CDScheduler[43]: Thermal pressure state: 0 Memory pressure state: 0
Jul  3 08:21:18 authorMacBook-Pro kernel[0]: ARPT: 673255.225425: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  3 08:21:18 authorMacBook-Pro sharingd[30299]: 08:21:18.004 : Discoverable mode changed to Off
Jul  3 08:33:15 authorMacBook-Pro kernel[0]: ARPT: 673289.745639: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 1578355965, Ack 2401645769, Win size 278
Jul  3 08:33:41 authorMacBook-Pro locationd[82]: NETWORK: requery, 0, 0, 0, 0, 252, items, fQueryRetries, 0, fLastRetryTimestamp, 520783088.4
Jul  3 08:33:45 authorMacBook-Pro kernel[0]: ARPT: 673321.718258: wl0: setup_keepalive: Local port: 50542, Remote port: 5223
Jul  3 08:33:47 authorMacBook-Pro kernel[0]: PM response took 1857 ms (54, powerd)
Jul  3 08:45:12 authorMacBook-Pro kernel[0]: ARPT: 673324.060219: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 815278018, Ack 1982345407, Win size 278
Jul  3 08:45:12 authorMacBook-Pro kernel[0]: ARPT: 673325.798753: ARPT: Wake Reason: Wake on TCP Timeout
Jul  3 08:59:58 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 09:00:02 authorMacBook-Pro kernel[0]: ARPT: 673399.580233: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 13027,
Jul  3 09:09:20 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 8
Jul  3 09:09:50 authorMacBook-Pro kernel[0]: ARPT: 673431.714836: wl0: setup_keepalive: Local port: 50601, Remote port: 5223
Jul  3 09:09:58 authorMacBook-Pro kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  3 09:21:24 authorMacBook-Pro kernel[0]: hibernate_alloc_pages act 173850, inact 24957, anon 891, throt 0, spec 73492, wire 527143, wireinit 39927
Jul  3 09:21:24 authorMacBook-Pro kernel[0]: hibernate_teardown_pmap_structs done: last_valid_compact_indx 282563
Jul  3 09:21:59 authorMacBook-Pro kernel[0]: ARPT: 673493.721766: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  3 09:22:01 authorMacBook-Pro kernel[0]: PM response took 1936 ms (54, powerd)
Jul  3 09:57:10 authorMacBook-Pro sharingd[30299]: 09:57:10.384 : Scanning mode Contacts Only
Jul  3 09:57:11 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  3 09:57:29 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[33216]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  3 09:57:35 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[33216]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  3 10:09:01 authorMacBook-Pro kernel[0]: Previous sleep cause: 5
Jul  3 10:09:01 authorMacBook-Pro kernel[0]: AirPort: Link Up on awdl0
Jul  3 10:09:01 authorMacBook-Pro ntpd[207]: sigio_handler: sigio_handler_active != 1
Jul  3 10:20:32 authorMacBook-Pro QQ[10018]: button report: 0x80039B7
Jul  3 10:28:07 authorMacBook-Pro pkd[324]: enabling pid=30298 for plug-in com.apple.ncplugin.weather(1.0) 131FE7ED-87F7-471D-8797-C11107688DF7 /System/Library/CoreServices/Weather.app/Contents/PlugIns/com.apple.ncplugin.weather.appex
Jul  3 10:32:45 authorMacBook-Pro QQ[10018]: FA||Url||taskID[2019353296] dealloc
Jul  3 10:40:41 authorMacBook-Pro GoogleSoftwareUpdateAgent[33263]: 2017-07-03 10:40:41.730 GoogleSoftwareUpdateAgent[33263/0x700000323000] [lvl=2] -[KSAgentApp performSelfUpdateWithEngine:] Checking for self update with Engine: <KSUpdateEngine:0x10062de70 ticketStore=<KSPersistentTicketStore:0x1005206e0 store=<KSKeyedPersistentStore:0x1005282c0 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore" lockFile=<KSLockFile:0x100510480 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/TicketStore/Keystone.ticketstore.lock" locked=NO > >> processor=<KSActionProcessor:0x10062e060 delegate=<KSUpdateEngine:0x10062de70> isProcessing=NO actionsCompleted=0 progress=0.00 errors=0 currentActionErrors=0 events=0 currentActionEvents=0 actionQueue=( ) > delegate=(null) serverInfoStore=<KSServerPrivateInfoStore:0x10062d2d0 path="/Users/xpc/Library/Google/GoogleSoftwareUpdate/Servers"> errors=0 >
Jul  3 10:40:42 authorMacBook-Pro GoogleSoftwareUpdateAgent[33263]: 2017-07-03 10:40:42.940 GoogleSoftwareUpdateAgent[33263/0x700000323000] [lvl=2] -[KSOmahaServer updateInfosForUpdateResponse:updateRequest:infoStore:upToDateTickets:updatedTickets:events:errors:] Response passed CUP validation.
Jul  3 11:22:49 authorMacBook-Pro QQ[10018]: FA||Url||taskID[2019353306] dealloc
Jul  3 11:27:14 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:27:14.923] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 11:31:49 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:31:49.472] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 11:31:49 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:31:49.593] itemasync_CopyProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2092
Jul  3 11:34:44 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:34:44.290] itemasync_CopyProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2092
Jul  3 11:38:27 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:38:27.892] <<<< IQ-CA >>>> piqca_setUsePreQueue: (0x7fce1406d600) rejecting report of layer being serviced - IQ has not yet begun to update
Jul  3 11:39:18 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:39:18.356] <<<< IQ-CA >>>> piqca_setUsePreQueue: (0x7fce15069400) rejecting report of layer being serviced - IQ has not yet begun to update
Jul  3 11:41:18 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:41:18.041] <<<< IQ-CA >>>> piqca_setUsePreQueue: (0x7fce16267800) rejecting report of layer being serviced - IQ has not yet begun to update
Jul  3 11:48:35 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:48:35.539] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 11:50:02 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:50:02.531] itemasync_SetProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2306
Jul  3 11:50:13 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:50:13.362] itemasync_SetProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2306
Jul  3 11:51:29 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:51:29.334] itemasync_SetProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2306
Jul  3 11:56:05 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:56:05.232] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 11:58:00 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:58:00.829] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 11:58:36 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [11:58:36.563] itemasync_CopyProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2092
Jul  3 12:02:22 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [12:02:22.126] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 12:03:48 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [12:03:48.669] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 12:04:32 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [12:04:32.065] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 12:11:47 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [12:11:47.043] itemasync_CopyProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2092
Jul  3 12:22:42 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [12:22:42.202] itemasync_SetProperty signalled err=-12785 (kFigBaseObjectError_Invalidated) (invalidated) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/Player/FigPlayer_Async.c line 2306
Jul  3 12:31:16 authorMacBook-Pro ntpd[207]: wake time set -0.855670 s
Jul  3 12:31:55 authorMacBook-Pro kernel[0]: Opened file /var/log/SleepWakeStacks.bin, size 172032, extents 1, maxio 2000000 ssd 1
Jul  3 12:35:55 authorMacBook-Pro locationd[82]: NETWORK: no response from server, reachability, 2, queryRetries, 0
Jul  3 12:35:56 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  3 12:36:01 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  3 12:36:01 authorMacBook-Pro kernel[0]: Unexpected payload found for message 9, dataLen 0
Jul  3 12:36:38 calvisitor-10-105-160-237 corecaptured[33373]: CCFile::captureLog
Jul  3 12:36:44 calvisitor-10-105-160-237 kernel[0]: en0: Supported channels 1 2 3 4 5 6 7 8 9 10 11 12 13 36 40 44 48 52 56 60 64 100 104 108 112 116 120 124 128 132 136 140 144 149 153 157 161
Jul  3 12:54:59 calvisitor-10-105-160-237 AddressBookSourceSync[33405]: Unrecognized attribute value: t:AbchPersonItemType
Jul  3 12:55:31 calvisitor-10-105-160-237 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 13:21:50 calvisitor-10-105-160-237 kernel[0]: ARPT: 681387.132167: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  3 13:31:32 calvisitor-10-105-160-237 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 13:31:32 calvisitor-10-105-160-237 kernel[0]: ARPT: 681446.072377: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  3 13:31:35 calvisitor-10-105-160-237 CrashReporterSupportHelper[252]: Internal name did not resolve to internal address!
Jul  3 13:31:51 calvisitor-10-105-160-237 com.apple.AddressBook.InternetAccountsBridge[33427]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  3 13:39:50 calvisitor-10-105-160-237 com.apple.xpc.launchd[1] (com.apple.WebKit.Networking.A546008E-07AF-4FFC-8FF8-D8FD260359D9[33438]): Service exited with abnormal code: 1
Jul  3 13:40:27 calvisitor-10-105-160-237 wirelessproxd[75]: Central manager is not powered on
Jul  3 13:48:22 calvisitor-10-105-160-237 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 6
Jul  3 13:48:22 authorMacBook-Pro configd[53]: setting hostname to "authorMacBook-Pro.local"
Jul  3 13:48:39 calvisitor-10-105-160-237 corecaptured[33452]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_13,48,39.362458]-CCIOReporter-002.xml, Current File [2017-07-03_13,48,39.362458]-CCIOReporter-002.xml
Jul  3 13:50:09 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc20795 14.17.42.14:14000
Jul  3 13:50:14 authorMacBook-Pro corecaptured[33452]: CCFile::copyFile fileName is [2017-07-03_13,48,39.308188]-io80211Family-002.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-03_13,48,39.308188]-io80211Family-002.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_13,50,14.954481]=AssocFail:sts:2_rsn:0/IO80211AWDLPeerManager//[2017-07-03_13,48,39.308188]-io80211Family-002.pcapng
Jul  3 13:50:15 authorMacBook-Pro kernel[0]: ARPT: 682068.402171: framerdy 0x0 bmccmd 7 framecnt 1024
Jul  3 13:51:03 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 20835 failed: 3 - No network route
Jul  3 13:51:03 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 20851 failed: 3 - No network route
Jul  3 13:51:32 calvisitor-10-105-160-237 com.apple.AddressBook.InternetAccountsBridge[33469]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  3 13:53:27 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from SUSPENDED to AUTO
Jul  3 13:53:39 calvisitor-10-105-160-237 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  3 13:53:53 calvisitor-10-105-160-237 sandboxd[129] ([33476]): com.apple.Addres(33476) deny network-outbound /private/var/run/mDNSResponder
Jul  3 13:54:18 calvisitor-10-105-160-237 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2e00ba0>:   DND Enabled: YES
Jul  3 13:54:35 calvisitor-10-105-160-237 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  3 13:54:36 calvisitor-10-105-160-237 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  3 13:54:53 calvisitor-10-105-160-237 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from SUSPENDED to AUTO
Jul  3 13:55:56 calvisitor-10-105-160-237 sharingd[30299]: 13:55:56.094 : Starting AirDrop server for user 501 on wake
Jul  3 14:20:59 calvisitor-10-105-160-237 kernel[0]: Sandbox: com.apple.Addres(33493) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  3 14:34:22 calvisitor-10-105-160-237 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 14:35:17 calvisitor-10-105-160-237 kernel[0]: ARPT: 682406.173418: wl0: setup_keepalive: Remote IP: 17.249.28.77
Jul  3 14:47:59 calvisitor-10-105-160-237 kernel[0]: ARPT: 682407.704265: wl0: wl_update_tcpkeep_seq: Original Seq: 1181052579, Ack: 1862377178, Win size: 4096
Jul  3 14:47:59 calvisitor-10-105-160-237 kernel[0]: RTC: Maintenance 2017/7/3 21:47:58, sleep 2017/7/3 21:35:20
Jul  3 14:48:22 calvisitor-10-105-160-237 kernel[0]: Sandbox: com.apple.Addres(33508) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  3 15:01:36 calvisitor-10-105-160-237 kernel[0]: ARPT: 682466.260119: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  3 15:01:36 calvisitor-10-105-160-237 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-03 22:01:36 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  3 15:01:36 calvisitor-10-105-160-237 kernel[0]: ARPT: 682468.243050: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  3 15:01:36 calvisitor-10-105-160-237 kernel[0]: ARPT: 682468.243133: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  3 15:15:13 calvisitor-10-105-160-237 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  3 15:15:31 calvisitor-10-105-160-237 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  3 15:15:34 calvisitor-10-105-160-237 com.apple.AddressBook.InternetAccountsBridge[33518]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  3 15:28:51 calvisitor-10-105-160-237 com.apple.WebKit.WebContent[32778]: <<<< FigByteStream >>>> FigByteStreamStatsLogOneRead: ByteStream read of 4812 bytes @ 358800 took 1.053312 secs. to complete, 5 reads >= 1 sec.
Jul  3 15:28:56 calvisitor-10-105-160-237 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  3 15:42:36 calvisitor-10-105-160-237 sandboxd[129] ([33523]): com.apple.Addres(33523) deny network-outbound /private/var/run/mDNSResponder
Jul  3 15:42:59 calvisitor-10-105-160-237 kernel[0]: ARPT: 682634.998705: wl0: setup_keepalive: Remote IP: 17.249.28.93
Jul  3 15:46:27 calvisitor-10-105-160-237 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  3 15:46:27 authorMacBook-Pro kernel[0]: ARPT: 682638.445688: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  3 15:46:28 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  3 15:46:29 authorMacBook-Pro UserEventAgent[43]: Captive: [CNInfoNetworkActive:1748] en0: SSID 'CalVisitor' making interface primary (cache indicates network not captive)
Jul  3 15:46:31 calvisitor-10-105-160-237 configd[53]: network changed: v4(en0:10.105.160.237) v6(en0!:2607:f140:6000:8:f1dc:a608:863:19ad) DNS Proxy SMB
Jul  3 15:47:12 calvisitor-10-105-160-237 corecaptured[33533]: Received Capture Event
Jul  3 15:47:13 calvisitor-10-105-160-237 corecaptured[33533]: CCFile::captureLog Received Capture notice id: 1499122032.492037, reason = AuthFail:sts:5_rsn:0
Jul  3 15:47:15 calvisitor-10-105-160-237 corecaptured[33533]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  3 15:47:15 calvisitor-10-105-160-237 corecaptured[33533]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 15:47:15 calvisitor-10-105-160-237 corecaptured[33533]: CCFile::copyFile fileName is [2017-07-03_15,47,15.246620]-AirPortBrcm4360_Logs-007.txt, source path:/var/log/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/DriverLogs//[2017-07-03_15,47,15.246620]-AirPortBrcm4360_Logs-007.txt, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/[2017-07-03_15,47,15.349129]=AuthFail:sts:5_rsn:0/DriverLogs//[2017-07-03_15,47,15.246620]-AirPortBrcm4360_Logs-007.txt
Jul  3 15:53:05 calvisitor-10-105-160-237 kernel[0]: en0: channel changed to 1
Jul  3 15:53:38 calvisitor-10-105-160-237 kernel[0]: Sandbox: com.apple.Addres(33540) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  3 15:53:49 calvisitor-10-105-160-237 corecaptured[33533]: CCLogTap::profileRemoved, Owner: com.apple.iokit.IO80211Family, Name: OneStats
Jul  3 16:05:45 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: <<<< FigByteStream >>>> FigByteStreamStatsLogOneRead: ByteStream read of 4321 bytes @ 48 took 0.607292 sec. to complete, 7 reads >= 0.5 sec.
Jul  3 16:05:45 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  3 16:05:49 authorMacBook-Pro kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  3 16:05:51 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,05,51.031703]-AirPortBrcm4360_Logs-003.txt, Current File [2017-07-03_16,05,51.031703]-AirPortBrcm4360_Logs-003.txt
Jul  3 16:05:51 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,05,51.075268]-AirPortBrcm4360_Logs-005.txt, Current File [2017-07-03_16,05,51.075268]-AirPortBrcm4360_Logs-005.txt
Jul  3 16:05:51 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,05,51.177343]-io80211Family-003.pcapng, Current File [2017-07-03_16,05,51.177343]-io80211Family-003.pcapng
Jul  3 16:05:51 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 16:05:51 authorMacBook-Pro corecaptured[33544]: CCFile::captureLog
Jul  3 16:06:19 calvisitor-10-105-160-237 corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,06,19.893324]-AirPortBrcm4360_Logs-008.txt, Current File [2017-07-03_16,06,19.893324]-AirPortBrcm4360_Logs-008.txt
Jul  3 16:07:32 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  3 16:07:33 authorMacBook-Pro configd[53]: network changed: v6(en0-:2607:f140:6000:8:d8d1:d506:6046:43e4) DNS- Proxy-
Jul  3 16:07:33 authorMacBook-Pro kernel[0]: ARPT: 682827.873728: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  3 16:07:33 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,06,19.861073]-CCIOReporter-008.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-03_16,06,19.861073]-CCIOReporter-008.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_16,07,33.914349]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-03_16,06,19.861073]-CCIOReporter-008.xml
Jul  3 16:07:33 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,07,33.934533]-AirPortBrcm4360_Logs-009.txt, Current File [2017-07-03_16,07,33.934533]-AirPortBrcm4360_Logs-009.txt
Jul  3 16:07:39 authorMacBook-Pro kernel[0]: ARPT: 682833.053879: framerdy 0x0 bmccmd 3 framecnt 1024
Jul  3 16:07:39 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,07,38.954579]-io80211Family-016.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-03_16,07,38.954579]-io80211Family-016.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_16,07,39.094895]=AuthFail:sts:5_rsn:0/IO80211AWDLPeerManager//[2017-07-03_16,07,38.954579]-io80211Family-016.pcapng
Jul  3 16:07:39 authorMacBook-Pro corecaptured[33544]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  3 16:07:39 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,07,39.096792]-CCIOReporter-017.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-03_16,07,39.096792]-CCIOReporter-017.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_16,07,39.171995]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-03_16,07,39.096792]-CCIOReporter-017.xml
Jul  3 16:07:39 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 16:07:40 authorMacBook-Pro corecaptured[33544]: CCFile::captureLog
Jul  3 16:07:40 authorMacBook-Pro kernel[0]: ARPT: 682834.192587: wlc_dump_aggfifo:
Jul  3 16:07:40 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,07,40.650186]-CCIOReporter-027.xml, Current File [2017-07-03_16,07,40.650186]-CCIOReporter-027.xml
Jul  3 16:07:46 authorMacBook-Pro corecaptured[33544]: CCFile::captureLog
Jul  3 16:07:46 authorMacBook-Pro kernel[0]: ARPT: 682840.256116: AQM agg results 0x8001 len hi/lo: 0x0 0x30 BAbitmap(0-3) 0 0 0 0
Jul  3 16:07:46 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,07,46.105103]-CCIOReporter-032.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-03_16,07,46.105103]-CCIOReporter-032.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_16,07,46.298508]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-03_16,07,46.105103]-CCIOReporter-032.xml
Jul  3 16:07:48 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x4 to 0x8000000000000000
Jul  3 16:08:13 calvisitor-10-105-160-237 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  3 16:25:21 calvisitor-10-105-160-237 kernel[0]: Wake reason: ?
Jul  3 16:25:21 calvisitor-10-105-160-237 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  3 16:25:21 calvisitor-10-105-160-237 kernel[0]: AirPort: Link Up on awdl0
Jul  3 16:25:21 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  3 16:25:27 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,25,27.859687]-CCIOReporter-038.xml, Current File [2017-07-03_16,25,27.859687]-CCIOReporter-038.xml
Jul  3 16:25:45 authorMacBook-Pro com.apple.WebKit.WebContent[25654]: [16:25:45.631] <<<< CRABS >>>> crabsFlumeHostUnavailable: [0x7f961cf08cf0] Byte flume reports host unavailable.
Jul  3 16:25:54 authorMacBook-Pro sandboxd[129] ([33562]): com.apple.Addres(33562) deny network-outbound /private/var/run/mDNSResponder
Jul  3 16:27:03 authorMacBook-Pro kernel[0]: ARPT: 682969.397322: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  3 16:27:03 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  3 16:27:05 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,27,04.995982]-io80211Family-040.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-03_16,27,04.995982]-io80211Family-040.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_16,27,05.123034]=AuthFail:sts:5_rsn:0/IO80211AWDLPeerManager//[2017-07-03_16,27,04.995982]-io80211Family-040.pcapng
Jul  3 16:27:05 authorMacBook-Pro corecaptured[33544]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  3 16:27:08 authorMacBook-Pro kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  3 16:27:09 authorMacBook-Pro kernel[0]: ARPT: 682977.654133: wlc_dump_aggfifo:
Jul  3 16:27:10 authorMacBook-Pro corecaptured[33544]: CCFile::copyFile fileName is [2017-07-03_16,27,09.910337]-AirPortBrcm4360_Logs-047.txt, source path:/var/log/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/DriverLogs//[2017-07-03_16,27,09.910337]-AirPortBrcm4360_Logs-047.txt, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/[2017-07-03_16,27,10.162319]=AuthFail:sts:5_rsn:0/DriverLogs//[2017-07-03_16,27,09.910337]-AirPortBrcm4360_Logs-047.txt
Jul  3 16:27:10 authorMacBook-Pro corecaptured[33544]: doSaveChannels@286: Will write to: /Library/Logs/CrashReporter/CoreCapture/IOReporters/[2017-07-03_16,27,09.307937] - AuthFail:sts:5_rsn:0.xml
Jul  3 16:27:11 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Authenticated
Jul  3 16:27:47 calvisitor-10-105-160-184 locationd[82]: Location icon should now be in state 'Inactive'
Jul  3 16:28:34 calvisitor-10-105-160-184 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 16:28:34 authorMacBook-Pro QQ[10018]: tcp_connection_destination_perform_socket_connect 21152 connectx to 203.205.147.206:8080@0 failed: [51] Network is unreachable
Jul  3 16:28:34 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21158 failed: 3 - No network route
Jul  3 16:28:35 authorMacBook-Pro corecaptured[33544]: Received Capture Event
Jul  3 16:28:40 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,28,40.259618]-AirPortBrcm4360_Logs-055.txt, Current File [2017-07-03_16,28,40.259618]-AirPortBrcm4360_Logs-055.txt
Jul  3 16:28:40 authorMacBook-Pro corecaptured[33544]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 16:28:40 authorMacBook-Pro corecaptured[33544]: CCFile::captureLog
Jul  3 16:28:40 authorMacBook-Pro kernel[0]: ARPT: 683047.197539: framerdy 0x0 bmccmd 3 framecnt 1024
Jul  3 16:28:55 calvisitor-10-105-160-184 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  3 16:28:56 calvisitor-10-105-160-184 QQ[10018]: button report: 0x8002bdf
Jul  3 16:29:09 calvisitor-10-105-160-184 corecaptured[33544]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_16,29,09.137954]-CCIOReporter-062.xml, Current File [2017-07-03_16,29,09.137954]-CCIOReporter-062.xml
Jul  3 16:29:09 calvisitor-10-105-160-184 corecaptured[33544]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  3 16:29:30 calvisitor-10-105-160-184 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  3 16:35:52 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Evaluating
Jul  3 16:35:54 calvisitor-10-105-160-184 networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! NeteaseMusic.17988 tc9008 103.251.128.144:80
Jul  3 16:36:40 calvisitor-10-105-160-184 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  3 16:36:40 calvisitor-10-105-160-184 AddressBookSourceSync[33594]: [CardDAVPlugin-ERROR] -getPrincipalInfo:[_controller supportsRequestCompressionAtURL:https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/] Error Domain=NSURLErrorDomain Code=-1001 "The request timed out." UserInfo={NSUnderlyingError=0x7f9af3646900 {Error Domain=kCFErrorDomainCFNetwork Code=-1001 "The request timed out." UserInfo={NSErrorFailingURLStringKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, NSErrorFailingURLKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, _kCFStreamErrorCodeKey=-2102, _kCFStreamErrorDomainKey=4, NSLocalizedDescription=The request timed out.}}, NSErrorFailingURLStringKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, NSErrorFailingURLKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, _kCFStreamErrorDomainKey=4, _kCFStreamErrorCodeKey=-2102, NSLocalizedDescription=The request timed out.}
Jul  3 16:36:49 calvisitor-10-105-160-184 corecaptured[33544]: CCFile::captureLog
Jul  3 16:36:55 calvisitor-10-105-160-184 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  3 16:42:37 calvisitor-10-105-160-184 kernel[0]: ARPT: 683172.046921: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  3 16:42:37 calvisitor-10-105-160-184 kernel[0]: ARPT: 683173.929950: ARPT: Wake Reason: Wake on Scan offload
Jul  3 16:56:42 calvisitor-10-105-160-184 kernel[0]: ARPT: 683239.026135: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  3 17:10:11 calvisitor-10-105-160-184 kernel[0]: hibernate image path: /var/vm/sleepimage
Jul  3 17:10:11 calvisitor-10-105-160-184 kernel[0]: hibernate_flush_memory: buffer_cache_gc freed up 13202 wired pages
Jul  3 17:10:11 calvisitor-10-105-160-184 kernel[0]: hibernate_machine_init pagesDone 455920 sum2 81cafc41, time: 185 ms, disk(0x20000) 847 Mb/s, comp bytes: 47288320 time: 32 ms 1369 Mb/s, crypt bytes: 158441472 time: 38 ms 3973 Mb/s
Jul  3 17:10:11 calvisitor-10-105-160-184 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  3 17:10:11 calvisitor-10-105-160-184 BezelServices 255.10[94]: ASSERTION FAILED: dvcAddrRef != ((void *)0) -[DriverServices getDeviceAddress:] line: 2789
Jul  3 17:23:55 calvisitor-10-105-160-184 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 4
Jul  3 17:23:55 calvisitor-10-105-160-184 kernel[0]: hibernate_machine_init reading
Jul  3 17:23:55 calvisitor-10-105-160-184 UserEventAgent[43]: assertion failed: 15G1510: com.apple.telemetry + 38574 [10D2E324-788C-30CC-A749-55AE67AEC7BC]: 0x7fc235807b90
Jul  3 17:25:12 calvisitor-10-105-160-184 kernel[0]: hibernate_flush_memory: buffer_cache_gc freed up 3349 wired pages
Jul  3 17:25:12 calvisitor-10-105-160-184 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  3 17:25:12 calvisitor-10-105-160-184 UserEventAgent[43]: assertion failed: 15G1510: com.apple.telemetry + 38574 [10D2E324-788C-30CC-A749-55AE67AEC7BC]: 0x7fc235807b90
Jul  3 17:25:13 calvisitor-10-105-160-184 kernel[0]: AirPort: Link Up on awdl0
Jul  3 17:25:15 calvisitor-10-105-160-184 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-04 00:25:15 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  3 17:25:31 calvisitor-10-105-160-184 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  3 17:26:04 calvisitor-10-105-160-184 WeChat[24144]: jemmytest
Jul  3 17:37:47 calvisitor-10-105-160-184 kernel[0]: hibernate_setup(0) took 4429 ms
Jul  3 17:37:47 calvisitor-10-105-160-184 kernel[0]: **** [IOBluetoothFamily][ProcessBluetoothTransportShowsUpActionWL] -- calling IOBluetoothFamily's registerService() -- 0x5fd0 -- 0x9a00 -- 0x6800 ****
Jul  3 17:37:47 calvisitor-10-105-160-184 kernel[0]: **** [IOBluetoothFamily][ProcessBluetoothTransportShowsUpActionWL] -- Connected to the transport successfully -- 0x5fd0 -- 0x9a00 -- 0x6800 ****
Jul  3 17:37:48 calvisitor-10-105-160-184 blued[85]: hciControllerOnline; HID devices? 0
Jul  3 17:37:48 calvisitor-10-105-160-184 blued[85]: INIT -- Host controller is published
Jul  3 17:51:25 calvisitor-10-105-160-184 kernel[0]: polled file major 1, minor 0, blocksize 4096, pollers 5
Jul  3 17:51:53 calvisitor-10-105-160-184 AddressBookSourceSync[33632]: Unrecognized attribute value: t:AbchPersonItemType
Jul  3 17:52:07 calvisitor-10-105-160-184 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  3 18:06:58 calvisitor-10-105-160-184 kernel[0]: BuildActDeviceEntry exit
Jul  3 18:07:09 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc21242 119.81.102.227:80
Jul  3 18:34:20 calvisitor-10-105-162-32 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  3 18:35:05 calvisitor-10-105-162-32 mDNSResponder[91]: mDNS_DeregisterInterface: Frequent transitions for interface en0 (10.105.162.32)
Jul  3 18:35:06 calvisitor-10-105-162-32 kernel[0]: ARPT: 683604.474196: IOPMPowerSource Information: onSleep,  SleepType: Standby,  'ExternalConnected': No, 'TimeRemaining': 578,
Jul  3 18:47:54 calvisitor-10-105-162-32 kernel[0]: ARPT: 683617.825411: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  3 18:47:59 calvisitor-10-105-162-32 kernel[0]: ARPT: 683623.036953: wl0: setup_keepalive: Remote IP: 17.249.12.155
Jul  3 18:56:23 calvisitor-10-105-162-32 kernel[0]: Wake reason: ARPT (Network)
Jul  3 18:56:23 calvisitor-10-105-162-32 kernel[0]: AppleActuatorHIDEventDriver: message service is terminated
Jul  3 18:56:23 calvisitor-10-105-162-32 BezelServices 255.10[94]: ASSERTION FAILED: dvcAddrRef != ((void *)0) -[DriverServices getDeviceAddress:] line: 2789
Jul  3 18:56:23 authorMacBook-Pro com.apple.WebKit.WebContent[25654]: [18:56:23.837] <<<< CRABS >>>> crabsFlumeHostUnavailable: [0x7f961cf08cf0] Byte flume reports host unavailable.
Jul  3 18:56:27 authorMacBook-Pro kernel[0]: en0: BSSID changed to 64:d9:89:6b:b5:33
Jul  3 18:56:33 calvisitor-10-105-162-32 QQ[10018]: button report: 0x80039B7
Jul  3 18:57:01 calvisitor-10-105-162-32 corecaptured[33660]: CCFile::captureLog Received Capture notice id: 1499133420.914478, reason = DeauthInd:sts:0_rsn:7
Jul  3 18:57:12 calvisitor-10-105-162-32 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  3 18:57:12 calvisitor-10-105-162-32 corecaptured[33660]: CCFile::captureLogRun Skipping current file Dir file [2017-07-03_18,57,12.221233]-AirPortBrcm4360_Logs-005.txt, Current File [2017-07-03_18,57,12.221233]-AirPortBrcm4360_Logs-005.txt
Jul  3 18:57:57 calvisitor-10-105-162-32 kernel[0]: payload Data 07 00
Jul  3 18:57:57 calvisitor-10-105-162-32 kernel[0]: [HID] [ATC] [Error] AppleDeviceManagementHIDEventService::start Could not make a string from out connection notification key
Jul  3 18:57:57 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  3 18:57:59 authorMacBook-Pro kernel[0]: en0: 802.11d country code set to 'US'.
Jul  3 18:58:10 authorMacBook-Pro corecaptured[33660]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 18:58:18 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  3 18:58:54 calvisitor-10-105-162-32 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  3 19:04:48 calvisitor-10-105-162-32 kernel[0]: WARNING: hibernate_page_list_setall skipped 11799 xpmapped pages
Jul  3 19:04:48 calvisitor-10-105-162-32 kernel[0]: hibernate_teardown: wired_pages 544767, free_pages 3578340, active_pages 40000, inactive_pages 0, speculative_pages 0, cleaned_pages 0, compressor_pages 112
Jul  3 19:04:48 calvisitor-10-105-162-32 kernel[0]: pages 554018, wire 418692, act 40000, inact 0, cleaned 0 spec 0, zf 0, throt 0, compr 112, xpmapped 40000
Jul  3 19:04:48 calvisitor-10-105-162-32 blued[85]: [BluetoothHIDDeviceController] EventServiceConnectedCallback
Jul  3 19:04:48 calvisitor-10-105-162-32 kernel[0]: **** [IOBluetoothFamily][ProcessBluetoothTransportShowsUpActionWL] -- calling IOBluetoothFamily's registerService() -- 0x5fd0 -- 0x9a00 -- 0xc800 ****
Jul  3 19:04:52 calvisitor-10-105-162-32 kernel[0]: ARPT: 683779.928118: framerdy 0x0 bmccmd 3 framecnt 1024
Jul  3 19:04:52 calvisitor-10-105-162-32 kernel[0]: ARPT: 683780.224800: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  3 19:04:52 calvisitor-10-105-162-32 corecaptured[33660]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  3 19:04:53 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [19:04:53.965] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 19:04:54 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21353 failed: 3 - No network route
Jul  3 19:04:58 authorMacBook-Pro corecaptured[33660]: Received Capture Event
Jul  3 19:05:32 calvisitor-10-105-162-32 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  3 19:05:37 calvisitor-10-105-162-32 corecaptured[33660]: CCFile::copyFile fileName is [2017-07-03_19,04,57.722196]-io80211Family-018.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-03_19,04,57.722196]-io80211Family-018.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_19,05,37.535347]=AuthFail:sts:2_rsn:0/IO80211AWDLPeerManager//[2017-07-03_19,04,57.722196]-io80211Family-018.pcapng
Jul  3 19:11:46 calvisitor-10-105-162-32 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  3 19:11:48 authorMacBook-Pro corecaptured[33660]: Received Capture Event
Jul  3 19:11:55 calvisitor-10-105-162-32 QQ[10018]: button report: 0x8002be0
Jul  3 19:46:35 authorMacBook-Pro kernel[0]: hibernate_rebuild_pmap_structs done: last_valid_compact_indx 285862
Jul  3 19:46:35 authorMacBook-Pro kernel[0]: BuildActDeviceEntry enter
Jul  3 19:46:41 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Authenticated
Jul  3 19:55:29 calvisitor-10-105-161-225 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  3 19:55:30 calvisitor-10-105-161-225 kernel[0]: en0: channel changed to 132,+1
Jul  3 20:07:56 calvisitor-10-105-161-225 mdworker[33804]: (ImportBailout.Error:1331) Asked to exit for Diskarb
Jul  3 20:16:59 calvisitor-10-105-161-225 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.33827): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.History.xpc/Contents/MacOS/com.apple.Safari.History error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  3 20:20:37 calvisitor-10-105-161-225 com.apple.WebKit.WebContent[32778]: [20:20:37.119] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 20:25:13 calvisitor-10-105-161-225 GoogleSoftwareUpdateAgent[33847]: 2017-07-03 20:25:13.378 GoogleSoftwareUpdateAgent[33847/0x7000002a0000] [lvl=2] -[KSUpdateCheckAction performAction] KSUpdateCheckAction starting update check for ticket(s): {( <KSTicket:0x10053b310 productID=com.google.Keystone version=1.2.8.57 xc=<KSPathExistenceChecker:0x10053ac30 path=/Users/xpc/Library/Google/GoogleSoftwareUpdate/GoogleSoftwareUpdate.bundle> url=https://tools.google.com/service/update2 creationDate=2017-02-18 15:41:17 ticketVersion=1 > )} Using server: <KSOmahaServer:0x100248090 engine=<KSUpdateEngine:0x1007249c0> >
Jul  3 20:55:46 calvisitor-10-105-161-225 com.apple.WebKit.WebContent[32778]: [20:55:46.310] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 20:56:39 calvisitor-10-105-161-225 WeChat[24144]: jemmytest
Jul  3 20:56:57 calvisitor-10-105-161-225 QQ[10018]: FA||Url||taskID[2019353376] dealloc
Jul  3 21:03:03 calvisitor-10-105-161-225 com.apple.WebKit.WebContent[32778]: [21:03:03.265] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 21:07:43 calvisitor-10-105-161-225 com.apple.WebKit.WebContent[32778]: [21:07:43.005] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 21:17:04 calvisitor-10-105-161-225 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  3 21:20:07 calvisitor-10-105-161-225 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  3 21:23:13 calvisitor-10-105-161-225 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.33936): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.ImageDecoder.xpc/Contents/MacOS/com.apple.Safari.ImageDecoder error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  3 21:27:07 calvisitor-10-105-161-225 com.apple.WebKit.WebContent[32778]: [21:27:07.761] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  3 21:30:39 calvisitor-10-105-161-225 ntpd[207]: sigio_handler: sigio_handler_active != 1
Jul  3 21:30:39 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21502 failed: 3 - No network route
Jul  3 21:30:39 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21503 failed: 3 - No network route
Jul  3 21:30:41 authorMacBook-Pro corecaptured[33951]: CCFile::captureLog
Jul  3 21:30:41 authorMacBook-Pro corecaptured[33951]: CCFile::copyFile fileName is [2017-07-03_21,30,41.859869]-CCIOReporter-002.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-03_21,30,41.859869]-CCIOReporter-002.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-03_21,30,40.703152]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-03_21,30,41.859869]-CCIOReporter-002.xml
Jul  3 21:30:44 authorMacBook-Pro kernel[0]: en0: channel changed to 1
Jul  3 21:30:50 authorMacBook-Pro kernel[0]: Sandbox: QQ(10018) deny(1) mach-lookup com.apple.networking.captivenetworksupport
Jul  3 21:30:54 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc21519 184.105.67.74:443
Jul  3 21:30:55 airbears2-10-142-110-255 kernel[0]: Sandbox: com.apple.Addres(33959) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  3 21:35:36 airbears2-10-142-110-255 locationd[82]: Location icon should now be in state 'Inactive'
Jul  3 21:41:47 airbears2-10-142-110-255 com.apple.WebKit.WebContent[32778]: [21:41:47.568] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 22:16:48 airbears2-10-142-110-255 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  3 22:32:26 airbears2-10-142-110-255 WeChat[24144]: jemmytest
Jul  3 23:07:12 airbears2-10-142-110-255 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 320, items, fQueryRetries, 1, fLastRetryTimestamp, 520841203.7
Jul  3 23:07:40 airbears2-10-142-110-255 locationd[82]: Location icon should now be in state 'Active'
Jul  3 23:16:10 airbears2-10-142-110-255 QQ[10018]: FA||Url||taskID[2019353410] dealloc
Jul  3 23:23:34 airbears2-10-142-110-255 com.apple.AddressBook.InternetAccountsBridge[34080]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  3 23:24:32 airbears2-10-142-110-255 com.apple.WebKit.WebContent[32778]: [23:24:32.378] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  3 23:29:01 airbears2-10-142-110-255 locationd[82]: Location icon should now be in state 'Inactive'
Jul  3 23:31:42 airbears2-10-142-110-255 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  3 23:44:36 airbears2-10-142-110-255 kernel[0]: ARPT: 697702.656868: AirPort_Brcm43xx::powerChange: System Sleep
Jul  3 23:55:44 airbears2-10-142-110-255 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2210 tcp_connection_tls_session_handle_read_error.790 error 60
Jul  4 00:22:21 airbears2-10-142-110-255 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 6349 seconds.  Ignoring.
Jul  4 00:23:04 airbears2-10-142-110-255 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 6306 seconds.  Ignoring.
Jul  4 00:35:57 airbears2-10-142-110-255 kernel[0]: ARPT: 697853.842104: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  4 00:35:57 airbears2-10-142-110-255 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5533 seconds.  Ignoring.
Jul  4 00:36:02 airbears2-10-142-110-255 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  4 00:36:07 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 44944 seconds.  Ignoring.
Jul  4 00:48:29 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 9749 seconds.  Ignoring.
Jul  4 01:00:22 airbears2-10-142-110-255 com.apple.AddressBook.InternetAccountsBridge[646]: Checking iCDP status for DSID 874161398 (checkWithServer=0)
Jul  4 01:00:25 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1883 seconds.  Ignoring.
Jul  4 01:00:35 airbears2-10-142-110-255 com.apple.CDScheduler[43]: Thermal pressure state: 0 Memory pressure state: 0
Jul  4 01:13:14 airbears2-10-142-110-255 kernel[0]: ARPT: 698052.637142: AirPort_Brcm43xx::powerChange: System Sleep
Jul  4 01:24:39 airbears2-10-142-110-255 kernel[0]: ARPT: 698055.177765: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  4 01:37:11 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 207556 seconds.  Ignoring.
Jul  4 01:37:37 airbears2-10-142-110-255 kernel[0]: ARPT: 698150.103985: wl0: setup_keepalive: Remote IP: 17.249.12.144
Jul  4 01:37:39 airbears2-10-142-110-255 kernel[0]: ARPT: 698152.085457: AirPort_Brcm43xx::powerChange: System Sleep
Jul  4 01:48:57 airbears2-10-142-110-255 kernel[0]: ARPT: 698152.618948: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  4 01:48:57 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 206850 seconds.  Ignoring.
Jul  4 01:49:07 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 206840 seconds.  Ignoring.
Jul  4 02:01:03 airbears2-10-142-110-255 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  4 02:01:14 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 39837 seconds.  Ignoring.
Jul  4 02:01:30 airbears2-10-142-110-255 com.apple.AddressBook.InternetAccountsBridge[34203]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 02:13:35 airbears2-10-142-110-255 com.apple.CDScheduler[43]: Thermal pressure state: 0 Memory pressure state: 0
Jul  4 02:25:27 airbears2-10-142-110-255 kernel[0]: Previous sleep cause: 5
Jul  4 02:25:27 airbears2-10-142-110-255 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 02:25:38 airbears2-10-142-110-255 QQ[10018]: ############################## _getSysMsgList
Jul  4 02:25:47 airbears2-10-142-110-255 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 38276 seconds.  Ignoring.
Jul  4 02:26:13 airbears2-10-142-110-255 kernel[0]: ARPT: 698348.781411: wl0: MDNS: IPV6 Addr: 2607:f140:400:a01b:1c57:7ef3:8f8e:5a10
Jul  4 02:37:39 airbears2-10-142-110-255 kernel[0]: Previous sleep cause: 5
Jul  4 02:37:39 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 3199 seconds.  Ignoring.
Jul  4 02:38:25 airbears2-10-142-110-255 kernel[0]: ARPT: 698398.428268: wl0: setup_keepalive: Remote IP: 17.249.12.88
Jul  4 02:49:55 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1728 seconds.  Ignoring.
Jul  4 02:49:55 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1728 seconds.  Ignoring.
Jul  4 02:50:09 airbears2-10-142-110-255 com.apple.AddressBook.InternetAccountsBridge[34235]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 03:01:56 airbears2-10-142-110-255 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  4 03:02:06 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1732 seconds.  Ignoring.
Jul  4 03:14:08 airbears2-10-142-110-255 kernel[0]: ARPT: 698501.213099: ARPT: Wake Reason: Wake on TCP Timeout
Jul  4 03:26:40 airbears2-10-142-110-255 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 34623 seconds.  Ignoring.
Jul  4 03:27:06 airbears2-10-142-110-255 kernel[0]: ARPT: 698596.169927: wl0: setup_keepalive: Local IP: 10.142.110.255
Jul  4 03:38:32 airbears2-10-142-110-255 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 03:38:55 airbears2-10-142-110-255 kernel[0]: Sandbox: com.apple.Addres(34268) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 03:50:54 airbears2-10-142-110-255 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  4 03:50:58 airbears2-10-142-110-255 cloudd[326]:  SecOSStatusWith error:[-50] Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  4 03:51:31 airbears2-10-142-110-255 kernel[0]: PM response took 1999 ms (54, powerd)
Jul  4 04:15:26 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 31785 seconds.  Ignoring.
Jul  4 04:27:18 airbears2-10-142-110-255 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  4 04:27:18 airbears2-10-142-110-255 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 04:27:18 airbears2-10-142-110-255 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 5 us
Jul  4 04:27:18 airbears2-10-142-110-255 kernel[0]: en0: channel changed to 6
Jul  4 04:27:39 airbears2-10-142-110-255 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  4 04:39:52 airbears2-10-142-110-255 kernel[0]: Sandbox: com.apple.Addres(34309) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 04:40:15 airbears2-10-142-110-255 kernel[0]: ARPT: 698894.284410: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  4 04:40:17 airbears2-10-142-110-255 kernel[0]: ARPT: 698896.274509: AirPort_Brcm43xx::powerChange: System Sleep
Jul  4 04:51:41 airbears2-10-142-110-255 kernel[0]: ARPT: 698896.831598: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  4 04:51:41 airbears2-10-142-110-255 kernel[0]: ARPT: 698898.741521: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  4 04:52:01 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 29590 seconds.  Ignoring.
Jul  4 04:52:25 airbears2-10-142-110-255 QQ[10018]: ############################## _getSysMsgList
Jul  4 05:04:19 airbears2-10-142-110-255 kernel[0]: Sandbox: com.apple.Addres(34326) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 05:16:07 airbears2-10-142-110-255 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 05:16:28 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 28123 seconds.  Ignoring.
Jul  4 05:28:19 airbears2-10-142-110-255 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 2 us
Jul  4 05:28:19 airbears2-10-142-110-255 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  4 05:28:30 airbears2-10-142-110-255 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  4 05:28:30 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1077 seconds.  Ignoring.
Jul  4 05:40:41 airbears2-10-142-110-255 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 192946 seconds.  Ignoring.
Jul  4 06:03:25 airbears2-10-142-110-255 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  4 06:03:27 authorMacBook-Pro corecaptured[34369]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  4 06:12:51 calvisitor-10-105-162-105 kernel[0]: ARPT: 699244.827573: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 2935131210, Ack 3049709979, Win size 278
Jul  4 06:12:51 calvisitor-10-105-162-105 kernel[0]: ARPT: 699246.920246: ARPT: Wake Reason: Wake on Scan offload
Jul  4 06:12:52 calvisitor-10-105-162-105 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  4 06:13:45 calvisitor-10-105-162-105 kernel[0]: ARPT: 699300.508954: wl0: setup_keepalive: Local IP: 10.105.162.105
Jul  4 06:25:39 authorMacBook-Pro com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 23884 seconds.  Ignoring.
Jul  4 06:25:49 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 190238 seconds.  Ignoring.
Jul  4 06:26:04 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34408]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 06:26:11 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 23852 seconds.  Ignoring.
Jul  4 06:39:19 calvisitor-10-105-162-105 kernel[0]: ARPT: 699352.804212: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 2794574676, Ack 1746081928, Win size 278
Jul  4 06:39:19 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 06:26:28 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  4 06:39:19 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 06:39:19 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 189428 seconds.  Ignoring.
Jul  4 06:39:25 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1852 seconds.  Ignoring.
Jul  4 06:39:30 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1847 seconds.  Ignoring.
Jul  4 06:40:13 calvisitor-10-105-162-105 kernel[0]: ARPT: 699408.252331: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  4 06:52:56 calvisitor-10-105-162-105 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  4 06:52:58 authorMacBook-Pro configd[53]: network changed: v4(en0-:10.105.162.105) v6(en0-:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS- Proxy-
Jul  4 06:53:02 authorMacBook-Pro kernel[0]: AirPort: Link Up on en0
Jul  4 06:53:12 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34429]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  4 06:53:18 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(34429) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 06:53:41 calvisitor-10-105-162-105 kernel[0]: ARPT: 699456.025397: wl0: setup_keepalive: Local port: 63572, Remote port: 443
Jul  4 06:53:43 calvisitor-10-105-162-105 kernel[0]: PM response took 1999 ms (54, powerd)
Jul  4 07:06:34 authorMacBook-Pro configd[53]: setting hostname to "authorMacBook-Pro.local"
Jul  4 07:06:34 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21875 failed: 3 - No network route
Jul  4 07:06:38 calvisitor-10-105-162-105 kernel[0]: en0: channel changed to 1
Jul  4 07:06:38 calvisitor-10-105-162-105 kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  4 07:06:42 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 215 seconds.  Ignoring.
Jul  4 07:10:01 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 07:10:01 calvisitor-10-105-162-105 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 07:10:06 authorMacBook-Pro kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  4 07:10:11 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 6 seconds.  Ignoring.
Jul  4 07:10:28 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34457]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 07:10:40 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 187547 seconds.  Ignoring.
Jul  4 07:23:41 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  4 07:23:41 calvisitor-10-105-162-105 kernel[0]: en0: BSSID changed to 5c:50:15:36:bc:03
Jul  4 07:23:47 authorMacBook-Pro configd[53]: network changed: DNS*
Jul  4 07:23:47 calvisitor-10-105-162-105 kernel[0]: en0: Supported channels 1 2 3 4 5 6 7 8 9 10 11 12 13 36 40 44 48 52 56 60 64 100 104 108 112 116 120 124 128 132 136 140 144 149 153 157 161 165
Jul  4 07:26:18 authorMacBook-Pro kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  4 07:26:28 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 186599 seconds.  Ignoring.
Jul  4 07:26:30 calvisitor-10-105-162-105 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 320, items, fQueryRetries, 1, fLastRetryTimestamp, 520871064.1
Jul  4 07:26:52 calvisitor-10-105-162-105 kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:13
Jul  4 07:39:57 calvisitor-10-105-162-105 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  4 07:39:59 calvisitor-10-105-162-105 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 07:40:17 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 185770 seconds.  Ignoring.
Jul  4 07:40:52 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 9995 seconds.  Ignoring.
Jul  4 07:54:21 calvisitor-10-105-162-105 kernel[0]: ARPT: 699815.080622: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  4 08:20:49 calvisitor-10-105-162-105 kernel[0]: ARPT: 699878.306468: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  4 08:20:51 calvisitor-10-105-162-105 kernel[0]: en0: 802.11d country code set to 'US'.
Jul  4 08:20:51 calvisitor-10-105-162-105 kernel[0]: en0: Supported channels 1 2 3 4 5 6 7 8 9 10 11 12 13 36 40 44 48 52 56 60 64 100 104 108 112 116 120 124 128 132 136 140 144 149 153 157 161
Jul  4 08:21:00 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 183327 seconds.  Ignoring.
Jul  4 08:21:00 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 183327 seconds.  Ignoring.
Jul  4 08:21:25 calvisitor-10-105-162-105 corecaptured[34531]: Received Capture Event
Jul  4 08:21:34 calvisitor-10-105-162-105 kernel[0]: ARPT: 699925.384446: wl0: setup_keepalive: Seq: 4253304142, Ack: 3255241453, Win size: 4096
Jul  4 08:34:26 calvisitor-10-105-162-105 kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  4 08:34:31 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  4 08:34:36 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 182511 seconds.  Ignoring.
Jul  4 08:48:07 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21983 failed: 3 - No network route
Jul  4 08:48:12 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Authenticated
Jul  4 08:48:35 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34554]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 08:48:50 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 181657 seconds.  Ignoring.
Jul  4 09:01:41 calvisitor-10-105-162-105 kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  4 09:01:42 calvisitor-10-105-162-105 kernel[0]: en0: channel changed to 1
Jul  4 09:01:43 authorMacBook-Pro com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5144 seconds.  Ignoring.
Jul  4 09:01:43 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 21993 failed: 3 - No network route
Jul  4 09:01:43 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  4 09:01:47 authorMacBook-Pro kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:13
Jul  4 09:01:47 authorMacBook-Pro kernel[0]: Sandbox: QQ(10018) deny(1) mach-lookup com.apple.networking.captivenetworksupport
Jul  4 09:01:48 calvisitor-10-105-162-105 configd[53]: network changed: v4(en0:10.105.162.105) v6(en0+:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  4 09:02:25 calvisitor-10-105-162-105 QQ[10018]: FA||Url||taskID[2019353444] dealloc
Jul  4 09:15:18 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  4 09:28:56 calvisitor-10-105-162-105 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 09:29:21 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34589]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 09:42:32 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 138 seconds.  Ignoring.
Jul  4 09:42:52 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 12051 seconds.  Ignoring.
Jul  4 09:42:57 calvisitor-10-105-162-105 GoogleSoftwareUpdateAgent[34603]: 2017-07-04 09:42:57.924 GoogleSoftwareUpdateAgent[34603/0x700000323000] [lvl=2] +[KSCodeSigningVerification verifyBundle:applicationId:error:] KSCodeSigningVerification verifying code signing for '/Users/xpc/Library/Google/GoogleSoftwareUpdate/GoogleSoftwareUpdate.bundle/Contents/MacOS/GoogleSoftwareUpdateDaemon' with the requirement 'anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU]="EQHXZ8M8AV" and (identifier="com.google.Keystone")'
Jul  4 09:42:58 calvisitor-10-105-162-105 ksfetch[34604]: 2017-07-04 09:42:58.121 ksfetch[34604/0x7fff79824000] [lvl=2] main() ksfetch done fetching.
Jul  4 09:43:18 calvisitor-10-105-162-105 kernel[0]: ARPT: 700254.389213: wl0: setup_keepalive: Seq: 2502126767, Ack: 2906384231, Win size: 4096
Jul  4 09:56:08 calvisitor-10-105-162-105 kernel[0]: ARPT: 700256.949512: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  4 09:56:10 calvisitor-10-105-162-105 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 09:56:38 calvisitor-10-105-162-105 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  4 09:57:01 calvisitor-10-105-162-105 kernel[0]: ARPT: 700311.376442: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  4 09:57:01 calvisitor-10-105-162-105 kernel[0]: ARPT: 700311.376459: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  4 09:57:30 calvisitor-10-105-162-105 kernel[0]: en0: 802.11d country code set to 'X3'.
Jul  4 09:57:30 authorMacBook-Pro kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  4 09:57:30 authorMacBook-Pro com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 11173 seconds.  Ignoring.
Jul  4 09:57:30 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 09:57:31 authorMacBook-Pro configd[53]: network changed: v4(en0!:10.105.162.105) DNS+ Proxy+ SMB
Jul  4 09:57:36 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1737 seconds.  Ignoring.
Jul  4 10:09:39 calvisitor-10-105-162-105 AddressBookSourceSync[34636]: -[SOAPParser:0x7f82b1f24e50 parser:didStartElement:namespaceURI:qualifiedName:attributes:] Type not found in EWSItemType for ExchangePersonIdGuid (t:ExchangePersonIdGuid)
Jul  4 10:13:04 calvisitor-10-105-162-105 mDNSResponder[91]: mDNS_RegisterInterface: Frequent transitions for interface en0 (FE80:0000:0000:0000:C6B3:01FF:FECD:467F)
Jul  4 10:13:05 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[25654]: [10:13:05.044] <<<< CRABS >>>> crabsFlumeHostAvailable: [0x7f961cf08cf0] Byte flume reports host available again.
Jul  4 10:13:12 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 10319 seconds.  Ignoring.
Jul  4 10:26:52 calvisitor-10-105-162-105 QQ[10018]: ############################## _getSysMsgList
Jul  4 10:29:35 calvisitor-10-105-162-105 kernel[0]: Setting BTCoex Config: enable_2G:1, profile_2g:0, enable_5G:1, profile_5G:0
Jul  4 10:29:44 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 43063 seconds.  Ignoring.
Jul  4 10:30:16 calvisitor-10-105-162-105 AddressBookSourceSync[34670]: Unrecognized attribute value: t:AbchPersonItemType
Jul  4 10:43:11 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 10:43:27 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 8416 seconds.  Ignoring.
Jul  4 10:43:31 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 8500 seconds.  Ignoring.
Jul  4 10:43:42 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34685]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 10:43:46 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34685]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 10:43:48 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(34685) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 10:43:56 calvisitor-10-105-162-105 kernel[0]: ARPT: 700626.024536: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  4 10:43:57 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 10:56:48 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  4 10:56:48 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 7615 seconds.  Ignoring.
Jul  4 10:56:57 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1609 seconds.  Ignoring.
Jul  4 10:57:46 calvisitor-10-105-162-105 kernel[0]: ARPT: 700687.112611: AirPort_Brcm43xx::powerChange: System Sleep
Jul  4 11:10:27 calvisitor-10-105-162-105 kernel[0]: en0: channel changed to 1
Jul  4 11:10:51 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34706]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 11:10:58 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [11:10:58.940] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 11:24:04 calvisitor-10-105-162-105 kernel[0]: AirPort: Link Down on en0. Reason 8 (Disassociated because station leaving).
Jul  4 11:24:13 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5970 seconds.  Ignoring.
Jul  4 11:25:03 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 172284 seconds.  Ignoring.
Jul  4 11:28:35 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  4 11:28:35 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  4 11:28:41 authorMacBook-Pro corecaptured[34722]: CCFile::captureLog Received Capture notice id: 1499192921.020010, reason = AssocFail:sts:5_rsn:0
Jul  4 11:28:42 authorMacBook-Pro corecaptured[34722]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  4 11:28:55 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5688 seconds.  Ignoring.
Jul  4 11:29:09 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34727]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 11:29:09 calvisitor-10-105-162-105 corecaptured[34722]: CCFile::captureLogRun Skipping current file Dir file [2017-07-04_11,29,09.994819]-CCIOReporter-005.xml, Current File [2017-07-04_11,29,09.994819]-CCIOReporter-005.xml
Jul  4 11:29:10 calvisitor-10-105-162-105 corecaptured[34722]: CCFile::captureLogRun Skipping current file Dir file [2017-07-04_11,29,10.144779]-AirPortBrcm4360_Logs-008.txt, Current File [2017-07-04_11,29,10.144779]-AirPortBrcm4360_Logs-008.txt
Jul  4 11:29:20 calvisitor-10-105-162-105 kernel[0]: ARPT: 700863.801551: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  4 11:42:12 calvisitor-10-105-162-105 kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  4 11:42:36 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(34738) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 11:43:04 calvisitor-10-105-162-105 kernel[0]: ARPT: 700919.494551: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  4 11:55:51 calvisitor-10-105-162-105 kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  4 11:55:52 calvisitor-10-105-162-105 corecaptured[34743]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  4 11:55:56 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1878 seconds.  Ignoring.
Jul  4 11:56:36 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 170391 seconds.  Ignoring.
Jul  4 11:56:46 calvisitor-10-105-162-105 kernel[0]: ARPT: 700980.255260: wl0: setup_keepalive: Seq: 2955519239, Ack: 2597833420, Win size: 4096
Jul  4 12:06:20 calvisitor-10-105-162-105 corecaptured[34743]: CCLogTap::profileRemoved, Owner: com.apple.iokit.IO80211Family, Name: IO80211AWDLPeerManager
Jul  4 12:06:21 calvisitor-10-105-162-105 cloudd[326]:  SecOSStatusWith error:[-50] Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  4 12:06:24 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  4 12:06:36 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[34830]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  4 12:06:39 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(34830) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 12:06:43 calvisitor-10-105-162-105 sandboxd[129] ([34830]): com.apple.Addres(34830) deny network-outbound /private/var/run/mDNSResponder
Jul  4 12:07:03 calvisitor-10-105-162-105 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.34835): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.History.xpc/Contents/MacOS/com.apple.Safari.History error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  4 12:08:23 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [12:08:23.866] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 12:13:40 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [12:13:40.079] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 12:14:54 calvisitor-10-105-162-105 locationd[82]: Location icon should now be in state 'Inactive'
Jul  4 12:19:03 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [12:19:03.575] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 12:22:18 calvisitor-10-105-162-105 UserEventAgent[43]: extension com.apple.ncplugin.WorldClock -> (null)
Jul  4 12:25:26 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [12:25:26.551] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 12:27:11 calvisitor-10-105-162-105 kernel[0]: ARPT: 702237.246510: wl0: setup_keepalive: Local port: 49218, Remote port: 443
Jul  4 12:34:55 calvisitor-10-105-162-105 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  4 12:34:56 authorMacBook-Pro corecaptured[34861]: CCFile::captureLog Received Capture notice id: 1499196895.670989, reason = AuthFail:sts:5_rsn:0
Jul  4 12:34:56 authorMacBook-Pro corecaptured[34861]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  4 12:35:05 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 168082 seconds.  Ignoring.
Jul  4 12:35:15 calvisitor-10-105-162-105 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  4 12:35:33 calvisitor-10-105-162-105 AddressBookSourceSync[34888]: -[SOAPParser:0x7fc7025b2810 parser:didStartElement:namespaceURI:qualifiedName:attributes:] Type not found in EWSItemType for ExchangePersonIdGuid (t:ExchangePersonIdGuid)
Jul  4 12:48:36 calvisitor-10-105-162-105 kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  4 12:49:34 calvisitor-10-105-162-105 kernel[0]: ARPT: 702351.279867: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  4 13:02:13 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  4 13:02:13 calvisitor-10-105-162-105 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  4 13:02:14 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 177 seconds.  Ignoring.
Jul  4 13:02:23 calvisitor-10-105-162-105 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  4 13:02:23 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1769 seconds.  Ignoring.
Jul  4 13:02:39 calvisitor-10-105-162-105 AddressBookSourceSync[34904]: Unrecognized attribute value: t:AbchPersonItemType
Jul  4 13:15:51 calvisitor-10-105-162-105 kernel[0]: ARPT: 702415.308381: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  4 13:29:28 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  4 13:41:20 calvisitor-10-105-162-105 QQ[10018]: button report: 0x8002be0
Jul  4 13:43:06 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [13:43:06.901] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 13:55:13 calvisitor-10-105-162-105 locationd[82]: Location icon should now be in state 'Inactive'
Jul  4 13:56:31 calvisitor-10-105-162-105 com.apple.AddressBook.ContactsAccountsService[289]: [Accounts] Current connection, <NSXPCConnection: 0x7fda74805bf0> connection from pid 487, doesn't have account access.
Jul  4 13:56:31 calvisitor-10-105-162-105 SCIM[487]: [Accounts] Failed to update account with identifier 76FE6715-3D27-4F21-AA35-C88C1EA820E8, error: Error Domain=ABAddressBookErrorDomain Code=1002 "(null)"
Jul  4 14:05:06 calvisitor-10-105-162-105 locationd[82]: Location icon should now be in state 'Active'
Jul  4 14:19:40 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [14:19:40.459] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 14:33:25 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [14:33:25.556] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  4 14:34:52 calvisitor-10-105-162-105 com.apple.SecurityServer[80]: Session 101921 created
Jul  4 14:36:08 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [14:36:08.077] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 14:39:45 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [14:39:45.538] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 14:43:39 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [14:43:39.854] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  4 15:03:53 calvisitor-10-105-162-105 GoogleSoftwareUpdateAgent[35018]: 2017-07-04 15:03:53.270 GoogleSoftwareUpdateAgent[35018/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher(PrivateMethods) helperDidTerminate:] KSOutOfProcessFetcher fetch ended for URL: "https://tools.google.com/service/update2?cup2hreq=a70d6372a4e45a6cbba61cd7f057c79bf73c79db1b1951dc17c605e870f0419b&cup2key=7:934679018"
Jul  4 15:11:20 calvisitor-10-105-162-105 syslogd[44]: ASL Sender Statistics
Jul  4 15:20:08 calvisitor-10-105-162-105 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 300, items, fQueryRetries, 0, fLastRetryTimestamp, 520899307.1
Jul  4 15:30:20 calvisitor-10-105-162-105 locationd[82]: Location icon should now be in state 'Inactive'
Jul  4 15:35:04 calvisitor-10-105-162-105 quicklookd[35049]: Error returned from iconservicesagent: (null)
Jul  4 15:35:04 calvisitor-10-105-162-105 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f995060af50>.
Jul  4 15:35:04 calvisitor-10-105-162-105 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950411670>.
Jul  4 15:47:25 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[32778]: [15:47:25.614] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  4 16:31:38 calvisitor-10-105-162-105 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  4 16:31:50 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35110) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 16:31:54 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35110) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 16:32:07 calvisitor-10-105-162-105 QQ[10018]: button report: 0x8002be0
Jul  4 16:32:32 calvisitor-10-105-162-105 QQ[10018]: ############################## _getSysMsgList
Jul  4 16:58:45 calvisitor-10-105-162-105 kernel[0]: ARPT: 711599.232230: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  4 16:58:55 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4045 seconds.  Ignoring.
Jul  4 17:00:00 calvisitor-10-105-162-105 kernel[0]: kern_open_file_for_direct_io took 6 ms
Jul  4 17:12:34 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 151433 seconds.  Ignoring.
Jul  4 17:12:34 calvisitor-10-105-162-105 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 3226 seconds.  Ignoring.
Jul  4 17:13:03 calvisitor-10-105-162-105 sharingd[30299]: 17:13:03.545 : Starting AirDrop server for user 501 on wake
Jul  4 17:13:38 calvisitor-10-105-162-105 kernel[0]: ARPT: 711749.913729: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  4 17:26:03 calvisitor-10-105-162-105 kernel[0]: ARPT: 711752.511718: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  4 17:26:44 calvisitor-10-105-162-105 sharingd[30299]: 17:26:44.228 : Scanning mode Contacts Only
Jul  4 17:40:02 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35150) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 17:53:21 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 17:54:33 calvisitor-10-105-162-105 kernel[0]: ARPT: 711979.641310: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  4 18:07:00 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  4 18:07:01 calvisitor-10-105-162-105 QQ[10018]: button report: 0x80039B7
Jul  4 18:07:25 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35165]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  4 18:20:56 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 40 seconds.  Ignoring.
Jul  4 18:21:08 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35174]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 18:34:25 calvisitor-10-105-162-105 kernel[0]: ARPT: 712221.085635: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 70582765, Ack 3488103719, Win size 358
Jul  4 18:34:25 calvisitor-10-105-162-105 kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:13
Jul  4 18:34:26 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 42431 seconds.  Ignoring.
Jul  4 18:34:51 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35181]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 18:35:05 calvisitor-10-105-162-105 sharingd[30299]: 18:35:05.187 : Scanning mode Contacts Only
Jul  4 18:48:22 calvisitor-10-105-162-105 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  4 18:48:27 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35188]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  4 19:02:24 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000320
Jul  4 19:15:22 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 19:15:22 calvisitor-10-105-162-105 kernel[0]: Previous sleep cause: 5
Jul  4 19:15:41 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35207]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  4 19:16:35 calvisitor-10-105-162-105 kernel[0]: ARPT: 712526.783763: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  4 19:29:01 calvisitor-10-105-162-105 kernel[0]: ARPT: 712530.297675: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  4 19:29:41 calvisitor-10-105-162-105 WindowServer[184]: CGXDisplayDidWakeNotification [712572581805245]: posting kCGSDisplayDidWake
Jul  4 19:30:13 calvisitor-10-105-162-105 kernel[0]: ARPT: 712604.204993: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  4 19:42:58 calvisitor-10-105-162-105 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  4 19:43:32 calvisitor-10-105-162-105 wirelessproxd[75]: Peripheral manager is not powered on
Jul  4 19:43:56 calvisitor-10-105-162-105 kernel[0]: Opened file /var/log/SleepWakeStacks.bin, size 172032, extents 1, maxio 2000000 ssd 1
Jul  4 19:56:19 calvisitor-10-105-162-105 kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  4 19:56:41 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35229) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 19:57:00 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1867 seconds.  Ignoring.
Jul  4 20:09:58 calvisitor-10-105-162-105 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  4 20:10:18 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 36678 seconds.  Ignoring.
Jul  4 20:24:32 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 215 seconds.  Ignoring.
Jul  4 20:24:55 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35250) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 20:25:22 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 139865 seconds.  Ignoring.
Jul  4 20:25:23 calvisitor-10-105-162-105 kernel[0]: IOPMrootDomain: idle cancel, state 1
Jul  4 20:25:44 calvisitor-10-105-162-105 kernel[0]: ARPT: 712915.870808: wl0: MDNS: IPV4 Addr: 10.105.162.105
Jul  4 20:25:46 calvisitor-10-105-162-105 kernel[0]: ARPT: 712918.575461: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  4 20:38:11 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 2 us
Jul  4 20:38:12 calvisitor-10-105-162-105 kernel[0]: ARPT: 712921.782306: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  4 20:38:12 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 139095 seconds.  Ignoring.
Jul  4 20:38:13 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 35003 seconds.  Ignoring.
Jul  4 20:38:50 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 139057 seconds.  Ignoring.
Jul  4 20:51:50 calvisitor-10-105-162-105 kernel[0]: Wake reason: RTC (Alarm)
Jul  4 20:51:50 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 20:51:50 calvisitor-10-105-162-105 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-05 03:51:50 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  4 20:51:50 calvisitor-10-105-162-105 kernel[0]: ARPT: 712997.981881: IOPMPowerSource Information: onWake,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  4 20:52:10 calvisitor-10-105-162-105 com.apple.CDScheduler[43]: Thermal pressure state: 0 Memory pressure state: 0
Jul  4 20:54:03 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  4 20:54:03 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 20:54:03 calvisitor-10-105-162-105 sharingd[30299]: 20:54:03.455 : BTLE scanner Powered On
Jul  4 20:54:03 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 138144 seconds.  Ignoring.
Jul  4 20:54:04 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc22491 203.205.142.158:8080
Jul  4 20:54:25 calvisitor-10-105-162-105 kernel[0]: Sandbox: com.apple.Addres(35286) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  4 21:06:47 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 132 seconds.  Ignoring.
Jul  4 21:07:16 calvisitor-10-105-162-105 sharingd[30299]: 21:07:16.729 : Scanning mode Contacts Only
Jul  4 21:23:17 calvisitor-10-105-162-105 wirelessproxd[75]: Peripheral manager is not powered on
Jul  4 21:35:17 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 135670 seconds.  Ignoring.
Jul  4 21:35:54 calvisitor-10-105-162-105 kernel[0]: ARPT: 713439.104232: AirPort_Brcm43xx::powerChange: System Sleep
Jul  4 21:35:54 calvisitor-10-105-162-105 kernel[0]: ARPT: 713439.104255: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  4 21:49:26 calvisitor-10-105-162-105 kernel[0]: ARPT: 713493.575563: wl0: setup_keepalive: Remote IP: 17.249.28.75
Jul  4 22:02:21 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1843 seconds.  Ignoring.
Jul  4 22:02:21 calvisitor-10-105-162-105 com.apple.CDScheduler[43]: Thermal pressure state: 1 Memory pressure state: 0
Jul  4 22:15:48 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 22:29:25 calvisitor-10-105-162-105 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  4 22:29:26 calvisitor-10-105-162-105 sharingd[30299]: 22:29:26.099 : BTLE scanner Powered On
Jul  4 22:43:02 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  4 22:56:50 calvisitor-10-105-162-105 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 978 seconds.  Ignoring.
Jul  4 22:57:00 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35374]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  4 22:57:01 calvisitor-10-105-162-105 locationd[82]: NETWORK: no response from server, reachability, 2, queryRetries, 1
Jul  4 23:10:17 calvisitor-10-105-162-105 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 7
Jul  4 23:10:17 calvisitor-10-105-162-105 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  4 23:10:28 calvisitor-10-105-162-105 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.coredav] [Refusing to parse response to PROPPATCH because of content-type: [text/html; charset=UTF-8].]
Jul  4 23:10:29 calvisitor-10-105-162-105 kernel[0]: PM response took 113 ms (24144, WeChat)
Jul  4 23:10:31 calvisitor-10-105-162-105 WindowServer[184]: device_generate_lock_screen_screenshot: authw 0x7fa824145a00(2000)[0, 0, 1440, 900] shield 0x7fa825dafc00(2001), dev [1440,900]
Jul  4 23:10:40 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35382]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 23:13:35 calvisitor-10-105-162-105 com.apple.AddressBook.InternetAccountsBridge[35394]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  4 23:14:37 calvisitor-10-105-162-105 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.35400): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SearchHelper.xpc/Contents/MacOS/com.apple.Safari.SearchHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  4 23:16:14 calvisitor-10-105-162-105 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.35412): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SocialHelper.xpc/Contents/MacOS/com.apple.Safari.SocialHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  4 23:17:17 calvisitor-10-105-162-105 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  4 23:20:18 calvisitor-10-105-162-105 QQ[10018]: FA||Url||taskID[2019353517] dealloc
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00660011': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0067000f': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00670033': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x03600009': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0360001f': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x03f20026': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x009a0005': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00990013': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00690003': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006a0061': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006a00a6': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006a00a7': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006a00b2': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006d0002': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00b20001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x03ef000d': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00b8fffe': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00bb0001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00bc0007': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00c1000a': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00c40027': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00c5000c': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00e80002': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x03eb0001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x006f0001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x00730020': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x007c000c': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x007c0018': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x007d000e': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x008b036a': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x008b6fb5': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x008b0360': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x008bdeaa': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x008bdeb0': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x01f60001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x01f90004': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02080000': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02100004': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02120000': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02120002': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x023b0003': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x023d0001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02410003': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02420002': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02420006': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02470032': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02470045': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0247ffe9': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0249002a': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x024a00b2': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x025c0009': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0261fffd': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02640011': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0268000a': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02720002': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02740004': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02cc0000': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02d10001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02770011': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02780026': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x027b0006': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x027e0001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02801000': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02950006': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x0295001d': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x029f0014': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x029f003a': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02a60001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02b60001': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02b70006': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: Cocoa scripting error for '0x02cb000d': four character codes must be four characters long.
Jul  4 23:22:09 calvisitor-10-105-162-105 Microsoft Word[14463]: .sdef warning for argument '' of command 'can continue previous list' in suite 'Microsoft Word Suite': '4023' is not a valid type name.
Jul  4 23:25:29 calvisitor-10-105-162-105 WeChat[24144]: jemmytest
Jul  4 23:30:23 calvisitor-10-105-162-105 QQ[10018]: FA||Url||taskID[2019353519] dealloc
Jul  4 23:31:49 calvisitor-10-105-162-105 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  4 23:49:42 calvisitor-10-105-162-105 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  4 23:50:59 calvisitor-10-105-162-105 quicklookd[35391]: objc[35391]: Class TSUAtomicLRUCache is implemented in both /Library/QuickLook/iWork.qlgenerator/Contents/MacOS/iWork and /System/Library/PrivateFrameworks/OfficeImport.framework/Versions/A/OfficeImport. One of the two will be used. Which one is undefined.
Jul  4 23:50:59 calvisitor-10-105-162-105 garcon[35461]: Invalidating watch set.
Jul  4 23:50:59 calvisitor-10-105-162-105 QuickLookSatellite[35448]: objc[35448]: Class TSUCustomFormatData is implemented in both /Library/QuickLook/iWork.qlgenerator/Contents/MacOS/iWork and /System/Library/PrivateFrameworks/OfficeImport.framework/Versions/A/OfficeImport. One of the two will be used. Which one is undefined.
Jul  4 23:51:29 calvisitor-10-105-162-105 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  4 23:53:29 calvisitor-10-105-162-105 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  4 23:55:28 calvisitor-10-105-162-105 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.coredav] [Refusing to parse response to PROPPATCH because of content-type: [text/html; charset=UTF-8].]
Jul  5 00:02:22 calvisitor-10-105-162-105 WeChat[24144]: jemmytest
Jul  5 00:03:06 calvisitor-10-105-162-105 sharingd[30299]: 00:03:06.178 : Started generating hashes
Jul  5 00:03:36 calvisitor-10-105-162-105 sharingd[30299]: 00:03:36.715 : BTLE scanning started
Jul  5 00:09:34 calvisitor-10-105-162-105 WeChat[24144]: jemmytest
Jul  5 00:17:32 calvisitor-10-105-162-105 com.apple.WebKit.WebContent[35435]: <<<< FigByteStream >>>> FigByteStreamStatsLogOneRead: ByteStream read of 21335 bytes @ 5481561 took 0.501237 sec. to complete, 16 reads >= 0.5 sec.
Jul  5 00:17:35 calvisitor-10-105-162-105 locationd[82]: Location icon should now be in state 'Inactive'
Jul  5 00:17:50 authorMacBook-Pro corecaptured[35613]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  5 00:17:52 authorMacBook-Pro kernel[0]: AirPort: Link Up on en0
Jul  5 00:18:04 authorMacBook-Pro QQ[10018]: button report: 0x80039B7
Jul  5 00:18:07 authorMacBook-Pro QQ[10018]: button report: 0X80076ED
Jul  5 00:18:09 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[35618]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  5 00:18:12 authorMacBook-Pro AddressBookSourceSync[35614]: Unrecognized attribute value: t:AbchPersonItemType
Jul  5 00:21:07 authorMacBook-Pro Google Chrome[35628]: -_continuousScroll is deprecated for NSScrollWheel. Please use -hasPreciseScrollingDeltas.
Jul  5 00:21:07 authorMacBook-Pro Google Chrome[35628]: -deviceDeltaY is deprecated for NSScrollWheel. Please use -scrollingDeltaY.
Jul  5 00:28:42 authorMacBook-Pro com.apple.WebKit.WebContent[35671]: [00:28:42.167] (Fig) signalled err=-12871
Jul  5 00:29:04 authorMacBook-Pro com.apple.WebKit.WebContent[35671]: [00:29:04.085] <<<< CRABS >>>> crabsWaitForLoad: [0x7fbc7ac683a0] Wait time out - -1001 (msRequestTimeout -1)
Jul  5 00:29:25 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 22710 failed: 3 - No network route
Jul  5 00:30:00 calvisitor-10-105-163-10 syslogd[44]: Configuration Notice: ASL Module "com.apple.corecdp.osx.asl" claims selected messages. Those messages may not appear in standard system log files or in the ASL database.
Jul  5 00:33:56 calvisitor-10-105-163-10 locationd[82]: PBRequester failed with Error Error Domain=NSURLErrorDomain Code=-1001 "The request timed out." UserInfo={NSUnderlyingError=0x7fb7ed616c80 {Error Domain=kCFErrorDomainCFNetwork Code=-1001 "The request timed out." UserInfo={NSErrorFailingURLStringKey=https://gs-loc.apple.com/clls/wloc, NSErrorFailingURLKey=https://gs-loc.apple.com/clls/wloc, _kCFStreamErrorCodeKey=-2102, _kCFStreamErrorDomainKey=4, NSLocalizedDescription=The request timed out.}}, NSErrorFailingURLStringKey=https://gs-loc.apple.com/clls/wloc, NSErrorFailingURLKey=https://gs-loc.apple.com/clls/wloc, _kCFStreamErrorDomainKey=4, _kCFStreamErrorCodeKey=-2102, NSLocalizedDescription=The request timed out.}
Jul  5 00:47:16 calvisitor-10-105-163-10 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  5 00:53:57 calvisitor-10-105-163-10 locationd[82]: NETWORK: no response from server, reachability, 2, queryRetries, 2
Jul  5 00:55:33 calvisitor-10-105-163-10 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 284, items, fQueryRetries, 0, fLastRetryTimestamp, 520934130.6
Jul  5 00:58:26 calvisitor-10-105-163-10 wirelessproxd[75]: Failed to stop a scan - central is not powered on: 4
Jul  5 00:58:27 calvisitor-10-105-163-10 WindowServer[184]: device_generate_desktop_screenshot: authw 0x7fa82407ea00(2000), shield 0x7fa82435f400(2001)
Jul  5 01:19:55 calvisitor-10-105-163-10 kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  5 01:33:27 calvisitor-10-105-163-10 kernel[0]: en0: channel changed to 1
Jul  5 01:47:03 calvisitor-10-105-163-10 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 7
Jul  5 02:27:53 calvisitor-10-105-163-10 com.apple.AddressBook.InternetAccountsBridge[35749]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  5 02:27:53 calvisitor-10-105-163-10 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  5 02:27:57 calvisitor-10-105-163-10 com.apple.AddressBook.InternetAccountsBridge[35749]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  5 02:28:22 calvisitor-10-105-163-10 kernel[0]: ARPT: 720406.265686: AirPort_Brcm43xx::powerChange: System Sleep
Jul  5 02:41:24 calvisitor-10-105-163-10 kernel[0]: ARPT: 720413.304306: wl0: setup_keepalive: Remote IP: 17.249.12.81
Jul  5 02:54:51 calvisitor-10-105-163-10 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  5 03:08:26 calvisitor-10-105-163-10 kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:13
Jul  5 03:08:26 calvisitor-10-105-163-10 kernel[0]: en0: BSSID changed to 5c:50:15:4c:18:13
Jul  5 03:08:49 calvisitor-10-105-163-10 sandboxd[129] ([35762]): com.apple.Addres(35762) deny network-outbound /private/var/run/mDNSResponder
Jul  5 03:35:40 calvisitor-10-105-163-10 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  5 03:35:45 calvisitor-10-105-163-10 kernel[0]: ARPT: 720580.338311: AirPort_Brcm43xx::powerChange: System Sleep
Jul  5 03:49:12 calvisitor-10-105-163-10 kernel[0]: Wake reason: RTC (Alarm)
Jul  5 03:49:24 calvisitor-10-105-163-10 kernel[0]: Sandbox: com.apple.Addres(35773) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  5 03:49:51 calvisitor-10-105-163-10 kernel[0]: PM response took 1988 ms (54, powerd)
Jul  5 03:58:47 calvisitor-10-105-163-10 kernel[0]: Wake reason: EC.SleepTimer (SleepTimer)
Jul  5 03:58:47 calvisitor-10-105-163-10 kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  5 04:12:21 calvisitor-10-105-163-10 syslogd[44]: ASL Sender Statistics
Jul  5 04:12:22 calvisitor-10-105-163-10 kernel[0]: **** [BroadcomBluetoothHostControllerUSBTransport][start] -- Completed (matched on Device) -- 0x6000 ****
Jul  5 10:31:18 calvisitor-10-105-163-10 kernel[0]: hibernate_newruntime_map time: 0 ms, IOPolledFilePollersOpen(), ml_get_interrupts_enabled 0
Jul  5 10:31:18 calvisitor-10-105-163-10 kernel[0]: hibernate_machine_init pagesDone 451550 sum2 4886d9d9, time: 197 ms, disk(0x20000) 799 Mb/s, comp bytes: 40017920 time: 27 ms 1412 Mb/s, crypt bytes: 160550912 time: 39 ms 3904 Mb/s
Jul  5 10:31:18 calvisitor-10-105-163-10 kernel[0]: vm_compressor_fastwake_warmup (581519 - 591525) - starting
Jul  5 10:31:18 calvisitor-10-105-163-10 kernel[0]: BuildActDeviceEntry exit
Jul  5 10:31:19 calvisitor-10-105-163-10 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2e00ba0>: Updating enabled: YES   (Topics: ( "com.apple.private.alloy.icloudpairing", "com.apple.private.alloy.continuity.encryption", "com.apple.private.alloy.continuity.activity", "com.apple.ess", "com.apple.private.ids", "com.apple.private.alloy.phonecontinuity", "com.apple.madrid", "com.apple.private.ac", "com.apple.private.alloy.phone.auth", "com.apple.private.alloy.keychainsync", "com.apple.private.alloy.fmf", "com.apple.private.alloy.sms", "com.apple.private.alloy.screensharing", "com.apple.private.alloy.maps", "com.apple.private.alloy.thumper.keys", "com.apple.private.alloy.continuity.tethering" ))
Jul  5 10:31:23 calvisitor-10-105-163-10 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  5 10:31:24 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  5 10:31:56 calvisitor-10-105-160-179 locationd[82]: Location icon should now be in state 'Active'
Jul  5 10:32:08 calvisitor-10-105-160-179 locationd[82]: Location icon should now be in state 'Inactive'
Jul  5 10:41:38 calvisitor-10-105-160-179 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  5 10:43:32 calvisitor-10-105-160-179 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  5 10:44:16 calvisitor-10-105-160-179 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  5 10:45:00 calvisitor-10-105-160-179 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.35830): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.History.xpc/Contents/MacOS/com.apple.Safari.History error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  5 10:48:06 calvisitor-10-105-160-179 quicklookd[35840]: Error returned from iconservicesagent: (null)
Jul  5 10:52:15 calvisitor-10-105-160-179 GoogleSoftwareUpdateAgent[35861]: 2017-07-05 10:52:15.982 GoogleSoftwareUpdateAgent[35861/0x700000323000] [lvl=2] -[KSOutOfProcessFetcher(PrivateMethods) helperDidTerminate:] KSOutOfProcessFetcher fetch ended for URL: "https://tools.google.com/service/update2?cup2hreq=d297a7e5b56d6bd4faa75860fff6e485c301bf4e943a561afff6c8b3707ce948&cup2key=7:2988503627"
Jul  5 10:52:16 calvisitor-10-105-160-179 ksfetch[35863]: 2017-07-05 10:52:16.779 ksfetch[35863/0x7fff79824000] [lvl=2] main() Fetcher received a request: <NSMutableURLRequest: 0x100501610> { URL: https://tools.google.com/service/update2?cup2hreq=a7873a51b1cb55518e420d20dff47d463781ed3f7aa83c3153129eefb148070b&cup2key=7:2501762722 }
Jul  5 10:52:16 calvisitor-10-105-160-179 GoogleSoftwareUpdateAgent[35861]: 2017-07-05 10:52:16.977 GoogleSoftwareUpdateAgent[35861/0x700000323000] [lvl=2] -[KSPrefetchAction performAction] KSPrefetchAction no updates to prefetch.
Jul  5 10:56:49 calvisitor-10-105-160-179 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  5 10:57:01 calvisitor-10-105-160-179 QQ[10018]: 2017/07/05 10:57:01.130 | I | VoipWrapper  | DAVEngineImpl.cpp:1400:Close             | close video chat. llFriendUIN = 1742124257.
Jul  5 10:57:41 calvisitor-10-105-160-179 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  5 10:58:22 calvisitor-10-105-160-179 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.35873): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SocialHelper.xpc/Contents/MacOS/com.apple.Safari.SocialHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  5 10:58:44 calvisitor-10-105-160-179 imagent[355]: <IMMacNotificationCenterManager: 0x7fdcc9d16380>: notification observer: com.apple.FaceTime   notification: __CFNotification 0x7fdcc9d19110 {name = _NSDoNotDisturbEnabledNotification}
Jul  5 10:58:44 calvisitor-10-105-160-179 kernel[0]: Setting BTCoex Config: enable_2G:1, profile_2g:0, enable_5G:1, profile_5G:0
Jul  5 11:01:10 authorMacBook-Pro corecaptured[35877]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  5 11:01:55 calvisitor-10-105-160-179 corecaptured[35877]: Received Capture Event
Jul  5 11:01:55 calvisitor-10-105-160-179 corecaptured[35877]: CCFile::captureLogRun Skipping current file Dir file [2017-07-05_11,01,55.983179]-AirPortBrcm4360_Logs-006.txt, Current File [2017-07-05_11,01,55.983179]-AirPortBrcm4360_Logs-006.txt
Jul  5 11:39:37 calvisitor-10-105-160-179 symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  5 11:39:38 authorMacBook-Pro corecaptured[35877]: CCProfileMonitor::freeResources done
Jul  5 11:39:39 authorMacBook-Pro corecaptured[35889]: CCFile::copyFile fileName is [2017-07-05_11,39,39.743225]-CCIOReporter-001.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-05_11,39,39.743225]-CCIOReporter-001.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-05_11,39,38.739976]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-05_11,39,39.743225]-CCIOReporter-001.xml
Jul  5 11:40:26 calvisitor-10-105-160-226 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  5 11:42:05 calvisitor-10-105-160-226 Mail[11203]: tcp_connection_destination_perform_socket_connect 44073 connectx to 123.125.50.30:143@0 failed: [50] Network is down
Jul  5 11:42:53 calvisitor-10-105-160-226 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2d17980>:    NC Disabled: NO
Jul  5 11:42:53 calvisitor-10-105-160-226 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2d17980>:   DND Enabled: NO
Jul  5 11:47:49 calvisitor-10-105-160-226 quicklookd[35915]: Error returned from iconservicesagent: (null)
Jul  5 12:00:35 calvisitor-10-105-160-226 WindowServer[184]: CGXDisplayDidWakeNotification [723587602857832]: posting kCGSDisplayDidWake
Jul  5 12:00:39 calvisitor-10-105-160-226 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2e00ba0>:   DND Enabled: NO
Jul  5 12:00:50 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc22930 125.39.240.34:14000
Jul  5 12:00:58 calvisitor-10-105-160-226 com.apple.AddressBook.InternetAccountsBridge[35944]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  5 12:01:10 calvisitor-10-105-160-226 QQ[10018]: button report: 0x8002bdf
Jul  5 12:02:02 calvisitor-10-105-160-226 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  5 12:05:11 calvisitor-10-105-160-226 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  5 12:35:58 calvisitor-10-105-160-226 kernel[0]: en0: BSSID changed to 88:75:56:a0:95:ed
Jul  5 12:50:34 calvisitor-10-105-160-226 kernel[0]: ARPT: 724509.898718: wl0: MDNS: IPV4 Addr: 10.105.160.226
Jul  5 13:16:51 calvisitor-10-105-160-226 kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  5 13:43:58 calvisitor-10-105-160-226 kernel[0]: en0: BSSID changed to 88:75:56:a0:95:ed
Jul  5 13:44:18 calvisitor-10-105-160-226 com.apple.AddressBook.InternetAccountsBridge[646]: Daemon connection invalidated!
Jul  5 14:03:40 calvisitor-10-105-160-226 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  5 14:03:45 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288625.645942, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:12 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288652.126295, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:16 authorMacBook-Pro corecaptured[36034]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  5 14:04:19 authorMacBook-Pro corecaptured[36034]: CCFile::copyFile fileName is [2017-07-05_14,04,19.163834]-AirPortBrcm4360_Logs-025.txt, source path:/var/log/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/DriverLogs//[2017-07-05_14,04,19.163834]-AirPortBrcm4360_Logs-025.txt, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/[2017-07-05_14,04,19.222771]=AuthFail:sts:5_rsn:0/DriverLogs//[2017-07-05_14,04,19.163834]-AirPortBrcm4360_Logs-025.txt
Jul  5 14:04:19 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog
Jul  5 14:04:19 authorMacBook-Pro kernel[0]: ARPT: 724786.252727: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  5 14:04:19 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288659.752738, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:25 authorMacBook-Pro corecaptured[36034]: CCFile::captureLogRun Skipping current file Dir file [2017-07-05_14,04,25.118445]-AirPortBrcm4360_Logs-040.txt, Current File [2017-07-05_14,04,25.118445]-AirPortBrcm4360_Logs-040.txt
Jul  5 14:04:25 authorMacBook-Pro corecaptured[36034]: CCFile::copyFile fileName is [2017-07-05_14,04,25.705173]-CCIOReporter-044.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-05_14,04,25.705173]-CCIOReporter-044.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-05_14,04,25.777317]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-05_14,04,25.705173]-CCIOReporter-044.xml
Jul  5 14:04:26 authorMacBook-Pro corecaptured[36034]: doSaveChannels@286: Will write to: /Library/Logs/CrashReporter/CoreCapture/IOReporters/[2017-07-05_14,04,24.831957] - AssocFail:sts:5_rsn:0.xml
Jul  5 14:04:27 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288667.823332, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:27 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288667.956536, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:32 authorMacBook-Pro corecaptured[36034]: CCFile::copyFile fileName is [2017-07-05_14,04,32.840703]-io80211Family-056.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-05_14,04,32.840703]-io80211Family-056.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-05_14,04,32.969558]=AuthFail:sts:5_rsn:0/IO80211AWDLPeerManager//[2017-07-05_14,04,32.840703]-io80211Family-056.pcapng
Jul  5 14:04:32 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog Received Capture notice id: 1499288672.969558, reason = AuthFail:sts:5_rsn:0
Jul  5 14:04:33 authorMacBook-Pro corecaptured[36034]: Received Capture Event
Jul  5 14:04:33 authorMacBook-Pro corecaptured[36034]: CCFile::copyFile fileName is [2017-07-05_14,04,33.660387]-io80211Family-063.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-05_14,04,33.660387]-io80211Family-063.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-05_14,04,33.736169]=AuthFail:sts:5_rsn:0/IO80211AWDLPeerManager//[2017-07-05_14,04,33.660387]-io80211Family-063.pcapng
Jul  5 14:04:35 authorMacBook-Pro corecaptured[36034]: CCFile::captureLog
Jul  5 14:04:35 authorMacBook-Pro corecaptured[36034]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  5 14:15:40 authorMacBook-Pro configd[53]: network changed: v4(en0+:10.105.160.226) v6(en0:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  5 14:56:09 authorMacBook-Pro kernel[0]: ARPT: 724869.297011: IOPMPowerSource Information: onWake,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 4551,
Jul  5 14:56:13 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  5 14:56:14 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  5 15:26:36 calvisitor-10-105-162-98 kernel[0]: IOHibernatePollerOpen(0)
Jul  5 15:26:36 calvisitor-10-105-162-98 kernel[0]: hibernate_machine_init: state 2, image pages 446175, sum was d4e6c0b2, imageSize 0x2aea6000, image1Size 0x215a4000, conflictCount 5848, nextFree 5887
Jul  5 15:26:36 calvisitor-10-105-162-98 kernel[0]: [HID] [MT] AppleMultitouchDevice::willTerminate entered
Jul  5 15:40:14 calvisitor-10-105-162-98 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  5 15:40:14 calvisitor-10-105-162-98 BezelServices 255.10[94]: ASSERTION FAILED: dvcAddrRef != ((void *)0) -[DriverServices getDeviceAddress:] line: 2789
Jul  5 15:55:35 calvisitor-10-105-162-98 kernel[0]: hibernate_rebuild completed - took 10042450943433 msecs
Jul  5 15:55:35 calvisitor-10-105-162-98 kernel[0]: AppleActuatorDevice::stop Entered
Jul  5 15:55:35 calvisitor-10-105-162-98 kernel[0]: AppleActuatorDevice::start Entered
Jul  5 15:56:38 calvisitor-10-105-162-107 kernel[0]: ARPT: 725147.528572: AirPort_Brcm43xx::powerChange: System Sleep
Jul  5 16:04:10 calvisitor-10-105-162-107 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  5 16:04:10 calvisitor-10-105-162-107 kernel[0]: hibernate_page_list_setall found pageCount 488653
Jul  5 16:04:10 calvisitor-10-105-162-107 kernel[0]: bitmap_size 0x7f0fc, previewSize 0x4028, writing 488299 pages @ 0x97144
Jul  5 16:04:15 authorMacBook-Pro kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  5 16:04:43 calvisitor-10-105-162-107 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  5 16:05:05 calvisitor-10-105-162-107 kernel[0]: ARPT: 725209.960568: AQM agg params 0xfc0 maxlen hi/lo 0x0 0xffff minlen 0x0 adjlen 0x0
Jul  5 16:05:05 calvisitor-10-105-162-107 corecaptured[36091]: CCFile::captureLogRun Skipping current file Dir file [2017-07-05_16,05,05.078442]-io80211Family-008.pcapng, Current File [2017-07-05_16,05,05.078442]-io80211Family-008.pcapng
Jul  5 16:05:13 calvisitor-10-105-162-107 kernel[0]: ARPT: 725218.810934: AirPort_Brcm43xx::powerChange: System Sleep
Jul  5 16:05:44 calvisitor-10-105-162-107 kernel[0]: [HID] [MT] AppleMultitouchDevice::willTerminate entered
Jul  5 16:06:03 authorMacBook-Pro corecaptured[36091]: CCFile::captureLog Received Capture notice id: 1499295963.492254, reason = RoamFail:sts:1_rsn:1
Jul  5 16:12:50 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  5 16:12:52 authorMacBook-Pro cdpd[11807]: Saw change in network reachability (isReachable=0)
Jul  5 16:12:56 authorMacBook-Pro kernel[0]: en0: manual intervention required!
Jul  5 16:13:15 calvisitor-10-105-162-107 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2d17980>:    NC Disabled: NO
Jul  5 16:13:17 calvisitor-10-105-162-107 QQ[10018]: DB Error: 1 "no such table: tb_c2cMsg_2658655094"
Jul  5 16:18:06 calvisitor-10-105-162-107 GoogleSoftwareUpdateAgent[36128]: 2017-07-05 16:18:06.450 GoogleSoftwareUpdateAgent[36128/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher beginFetchWithDelegate:] KSOutOfProcessFetcher fetching from URL: "https://tools.google.com/service/update2?cup2hreq=ac844e04cbb398fcef4cf81b4ffc44a3ebc863e89d19c0b5d39d02d78d26675b&cup2key=7:677488741"
Jul  5 16:19:21 calvisitor-10-105-162-107 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 252, items, fQueryRetries, 0, fLastRetryTimestamp, 520989480.3
Jul  5 16:24:29 authorMacBook-Pro corecaptured[36150]: CCFile::captureLog Received Capture notice id: 1499297069.333005, reason = AuthFail:sts:5_rsn:0
Jul  5 16:24:29 authorMacBook-Pro kernel[0]: ARPT: 725996.598754: framerdy 0x0 bmccmd 3 framecnt 1024
Jul  5 16:24:29 authorMacBook-Pro kernel[0]: ARPT: 725996.811165: AQM agg params 0xfc0 maxlen hi/lo 0x0 0xffff minlen 0x0 adjlen 0x0
Jul  5 16:24:30 authorMacBook-Pro corecaptured[36150]: doSaveChannels@286: Will write to: /Library/Logs/CrashReporter/CoreCapture/IOReporters/[2017-07-05_16,24,29.663045] - AuthFail:sts:5_rsn:0.xml
Jul  5 16:24:44 airbears2-10-142-108-38 QQ[10018]: button report: 0x8002bdf
Jul  5 16:26:28 airbears2-10-142-108-38 corecaptured[36150]: CCLogTap::profileRemoved, Owner: com.apple.iokit.IO80211Family, Name: IO80211AWDLPeerManager
Jul  5 16:33:10 airbears2-10-142-108-38 locationd[82]: Location icon should now be in state 'Inactive'
Jul  5 16:37:58 airbears2-10-142-108-38 syslogd[44]: ASL Sender Statistics
Jul  5 16:47:16 airbears2-10-142-108-38 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  5 16:47:16 airbears2-10-142-108-38 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  5 16:47:58 airbears2-10-142-108-38 locationd[82]: Location icon should now be in state 'Active'
Jul  5 16:58:24 airbears2-10-142-108-38 imagent[355]: <IMMacNotificationCenterManager: 0x7fdcc9d16380>: Updating enabled: NO   (Topics: ( ))
Jul  5 16:58:25 airbears2-10-142-108-38 WindowServer[184]: device_generate_lock_screen_screenshot: authw 0x7fa82502bc00(2000)[0, 0, 0, 0] shield 0x7fa823930c00(2001), dev [1440,900]
Jul  5 16:58:39 airbears2-10-142-108-38 kernel[0]: ARPT: 728046.456828: wl0: setup_keepalive: Local IP: 10.142.108.38
Jul  5 17:01:33 airbears2-10-142-108-38 com.apple.AddressBook.InternetAccountsBridge[36221]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  5 17:02:52 airbears2-10-142-108-38 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  5 17:03:07 airbears2-10-142-108-38 corecaptured[36224]: CCFile::captureLog
Jul  5 17:03:12 airbears2-10-142-108-38 kernel[0]: ARPT: 728173.580097: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  5 17:03:12 airbears2-10-142-108-38 kernel[0]: ARPT: 728173.580149: wl0: MDNS: IPV4 Addr: 10.142.108.38
Jul  5 17:16:05 authorMacBook-Pro sandboxd[129] ([36227]): com.apple.Addres(36227) deny network-outbound /private/var/run/mDNSResponder
Jul  5 17:22:36 authorMacBook-Pro com.apple.WebKit.WebContent[25654]: [17:22:36.133] <<<< CRABS >>>> crabsFlumeHostAvailable: [0x7f961cf08cf0] Byte flume reports host available again.
Jul  5 17:22:56 calvisitor-10-105-163-9 configd[53]: setting hostname to "calvisitor-10-105-163-9.calvisitor.1918.berkeley.edu"
Jul  5 17:23:22 calvisitor-10-105-163-9 com.apple.AddressBook.InternetAccountsBridge[36248]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  5 17:25:05 calvisitor-10-105-163-9 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  5 17:25:06 authorMacBook-Pro com.apple.geod[30311]: PBRequester failed with Error Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline." UserInfo={NSUnderlyingError=0x7fe13530fc60 {Error Domain=kCFErrorDomainCFNetwork Code=-1009 "The Internet connection appears to be offline." UserInfo={NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorCodeKey=8, _kCFStreamErrorDomainKey=12, NSLocalizedDescription=The Internet connection appears to be offline.}}, NSErrorFailingURLStringKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, NSErrorFailingURLKey=https://gsp-ssl.ls.apple.com/dispatcher.arpc, _kCFStreamErrorDomainKey=12, _kCFStreamErrorCodeKey=8, NSLocalizedDescription=The Internet connection appears to be offline.}
Jul  5 17:25:08 authorMacBook-Pro kernel[0]: en0: BSSID changed to 00:a2:ee:1a:71:8c
Jul  5 17:25:08 authorMacBook-Pro kernel[0]: Unexpected payload found for message 9, dataLen 0
Jul  5 17:27:05 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  5 17:27:05 authorMacBook-Pro locationd[82]: Location icon should now be in state 'Inactive'
Jul  5 17:27:08 authorMacBook-Pro configd[53]: network changed: DNS* Proxy
Jul  5 17:27:48 calvisitor-10-105-163-9 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  5 17:39:14 authorMacBook-Pro sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  5 18:19:59 authorMacBook-Pro configd[53]: arp_client_transmit(en0) failed, Network is down (50)
Jul  5 18:19:59 authorMacBook-Pro kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  5 18:19:59 authorMacBook-Pro kernel[0]: en0: 802.11d country code set to 'X3'.
Jul  5 18:19:59 authorMacBook-Pro UserEventAgent[43]: Captive: CNPluginHandler en0: Inactive
Jul  5 18:20:06 authorMacBook-Pro networkd[195]: -[NETClientConnection evaluateCrazyIvan46] CI46 - Perform CrazyIvan46! QQ.10018 tc23407 119.81.102.227:80
Jul  5 18:20:07 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 23411 failed: 3 - No network route
Jul  5 19:00:16 authorMacBook-Pro Dropbox[24019]: [0705/190016:WARNING:dns_config_service_posix.cc(306)] Failed to read DnsConfig.
Jul  5 19:00:34 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from SUSPENDED to AUTO
Jul  5 19:00:37 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name CalendarAgent as bundle ID (this is expected for daemons without bundle ID
Jul  5 19:00:42 authorMacBook-Pro corecaptured[36291]: CCFile::captureLog
Jul  5 19:00:43 authorMacBook-Pro corecaptured[36291]: CCFile::captureLogRun Skipping current file Dir file [2017-07-05_19,00,43.154864]-CCIOReporter-007.xml, Current File [2017-07-05_19,00,43.154864]-CCIOReporter-007.xml
Jul  5 19:00:43 authorMacBook-Pro corecaptured[36291]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  5 19:00:46 authorMacBook-Pro kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  5 19:12:41 calvisitor-10-105-160-210 kernel[0]: ARPT: 728563.210777: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 3174,
Jul  5 19:26:27 calvisitor-10-105-160-210 kernel[0]: ARPT: 728620.515604: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  5 20:03:37 calvisitor-10-105-160-210 kernel[0]: Sandbox: com.apple.Addres(36325) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  5 20:16:55 calvisitor-10-105-160-210 kernel[0]: could discard act 242131 inact 107014 purgeable 254830 spec 128285 cleaned 0
Jul  5 20:16:55 calvisitor-10-105-160-210 kernel[0]: booter start at 1251 ms smc 0 ms, [18, 0, 0] total 367 ms, dsply 0, 0 ms, tramp 1080 ms
Jul  5 20:16:56 calvisitor-10-105-160-210 blued[85]: hostControllerOnline - Number of Paired devices = 1, List of Paired devices = ( "84-41-67-32-db-e1" )
Jul  5 20:17:19 calvisitor-10-105-160-210 sandboxd[129] ([36332]): com.apple.Addres(36332) deny network-outbound /private/var/run/mDNSResponder
Jul  5 20:44:17 calvisitor-10-105-160-210 kernel[0]: hibernate_newruntime_map time: 0 ms, IOPolledFilePollersOpen(), ml_get_interrupts_enabled 0
Jul  5 20:44:24 calvisitor-10-105-160-210 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-06 03:44:24 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  5 21:08:40 calvisitor-10-105-162-81 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  5 21:48:33 calvisitor-10-105-162-81 kernel[0]: Wake reason: ARPT (Network)
Jul  5 21:48:33 calvisitor-10-105-162-81 blued[85]: [BluetoothHIDDeviceController] EventServiceConnectedCallback
Jul  5 21:48:33 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  5 21:48:45 authorMacBook-Pro sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  5 22:29:03 calvisitor-10-105-161-231 kernel[0]: pages 1401204, wire 544128, act 416065, inact 0, cleaned 0 spec 3, zf 25, throt 0, compr 266324, xpmapped 40000
Jul  5 22:29:03 calvisitor-10-105-161-231 kernel[0]: could discard act 74490 inact 9782 purgeable 34145 spec 56242 cleaned 0
Jul  5 22:29:06 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  5 22:29:35 calvisitor-10-105-160-22 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  5 22:29:37 calvisitor-10-105-160-22 com.apple.AddressBook.InternetAccountsBridge[36395]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  5 23:09:36 calvisitor-10-105-160-22 kernel[0]: bitmap_size 0x7f0fc, previewSize 0x4028, writing 485676 pages @ 0x97144
Jul  5 23:09:36 calvisitor-10-105-160-22 kernel[0]: **** [BroadcomBluetoothHostController][SetupController] -- Delay HCI Reset by 300ms  ****
Jul  5 23:09:53 calvisitor-10-105-160-22 QQ[10018]: FA||Url||taskID[2019353593] dealloc
Jul  5 23:50:09 calvisitor-10-105-160-22 kernel[0]: AppleActuatorHIDEventDriver: stop
Jul  5 23:50:09 calvisitor-10-105-160-22 kernel[0]: **** [IOBluetoothHostControllerUSBTransport][start] -- completed -- result = TRUE -- 0xb000 ****
Jul  5 23:50:09 authorMacBook-Pro kernel[0]: AppleActuatorDeviceUserClient::start Entered
Jul  5 23:50:11 authorMacBook-Pro kernel[0]: ARPT: 729188.852474: AQM agg params 0xfc0 maxlen hi/lo 0x0 0xffff minlen 0x0 adjlen 0x0
Jul  5 23:50:51 calvisitor-10-105-162-211 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 299, items, fQueryRetries, 0, fLastRetryTimestamp, 521006902.2
Jul  6 00:30:35 calvisitor-10-105-162-211 kernel[0]: polled file major 1, minor 0, blocksize 4096, pollers 5
Jul  6 00:30:35 calvisitor-10-105-162-211 kernel[0]: IOHibernatePollerOpen(0)
Jul  6 00:30:35 authorMacBook-Pro UserEventAgent[43]: assertion failed: 15G1510: com.apple.telemetry + 38574 [10D2E324-788C-30CC-A749-55AE67AEC7BC]: 0x7fc235807b90
Jul  6 00:30:37 authorMacBook-Pro ksfetch[36439]: 2017-07-06 00:30:37.064 ksfetch[36439/0x7fff79824000] [lvl=2] main() Fetcher is exiting.
Jul  6 00:30:37 authorMacBook-Pro GoogleSoftwareUpdateAgent[36436]: 2017-07-06 00:30:37.071 GoogleSoftwareUpdateAgent[36436/0x7000002a0000] [lvl=2] -[KSUpdateEngine updateAllExceptProduct:] KSUpdateEngine updating all installed products, except:'com.google.Keystone'.
Jul  6 00:30:43 authorMacBook-Pro com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  6 01:11:06 authorMacBook-Pro Dropbox[24019]: [0706/011106:WARNING:dns_config_service_posix.cc(306)] Failed to read DnsConfig.
Jul  6 01:11:06 authorMacBook-Pro com.apple.WebKit.WebContent[32778]: [01:11:06.715] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  6 01:11:09 authorMacBook-Pro kernel[0]: Google Chrome He[36456] triggered unnest of range 0x7fff93c00000->0x7fff93e00000 of DYLD shared region in VM map 0x77c9114550458e7b. While not abnormal for debuggers, this increases system memory footprint until the target exits.
Jul  6 01:11:18 authorMacBook-Pro configd[53]: network changed: v4(en0+:10.105.162.138) v6(en0:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS! Proxy SMB
Jul  6 01:11:38 calvisitor-10-105-162-138 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  6 01:11:39 calvisitor-10-105-162-138 sandboxd[129] ([36461]): com.apple.Addres(36461) deny network-outbound /private/var/run/mDNSResponder
Jul  6 01:11:42 calvisitor-10-105-162-138 sandboxd[129] ([36461]): com.apple.Addres(36461) deny network-outbound /private/var/run/mDNSResponder
Jul  6 01:51:35 authorMacBook-Pro wirelessproxd[75]: Peripheral manager is not powered on
Jul  6 01:51:46 authorMacBook-Pro sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  6 02:32:06 calvisitor-10-105-163-28 kernel[0]: WARNING: hibernate_page_list_setall skipped 19622 xpmapped pages
Jul  6 02:32:06 calvisitor-10-105-163-28 kernel[0]: BuildActDeviceEntry enter
Jul  6 02:32:06 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 23645 failed: 3 - No network route
Jul  6 02:32:10 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-06 09:32:10 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  6 02:32:43 calvisitor-10-105-160-37 com.apple.AddressBook.InternetAccountsBridge[36491]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  6 02:32:44 calvisitor-10-105-160-37 sandboxd[129] ([36491]): com.apple.Addres(36491) deny network-outbound /private/var/run/mDNSResponder
Jul  6 03:12:38 calvisitor-10-105-160-37 kernel[0]: hibernate_alloc_pages act 107794, inact 10088, anon 460, throt 0, spec 58021, wire 572831, wireinit 39927
Jul  6 03:12:43 authorMacBook-Pro BezelServices 255.10[94]: ASSERTION FAILED: dvcAddrRef != ((void *)0) -[DriverServices getDeviceAddress:] line: 2789
Jul  6 03:12:49 authorMacBook-Pro networkd[195]: -[NETClientConnection evaluateCrazyIvan46] CI46 - Perform CrazyIvan46! QQ.10018 tc23677 123.151.137.101:80
Jul  6 03:13:09 calvisitor-10-105-160-37 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from SUSPENDED to AUTO
Jul  6 03:13:15 calvisitor-10-105-160-37 com.apple.AddressBook.InternetAccountsBridge[36502]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  6 03:53:08 calvisitor-10-105-160-37 kernel[0]: hibernate_page_list_setall(preflight 1) start
Jul  6 03:53:08 calvisitor-10-105-160-37 kernel[0]: hibernate_page_list_setall time: 603 ms
Jul  6 03:53:08 calvisitor-10-105-160-37 kernel[0]: IOPolledFilePollersOpen(0) 6 ms
Jul  6 03:53:08 calvisitor-10-105-160-37 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  6 03:53:18 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 23701 failed: 3 - No network route
Jul  6 04:33:35 calvisitor-10-105-160-37 kernel[0]: polled file major 1, minor 0, blocksize 4096, pollers 5
Jul  6 04:33:35 calvisitor-10-105-160-37 kernel[0]: hibernate_teardown completed - discarded 93932
Jul  6 04:33:35 calvisitor-10-105-160-37 kernel[0]: AppleActuatorDeviceUserClient::stop Entered
Jul  6 05:04:00 calvisitor-10-105-163-168 kernel[0]: pages 1418325, wire 548641, act 438090, inact 2, cleaned 0 spec 12, zf 30, throt 0, compr 254881, xpmapped 40000
Jul  6 05:04:00 calvisitor-10-105-163-168 kernel[0]: Opened file /var/vm/sleepimage, size 1073741824, extents 3, maxio 2000000 ssd 1
Jul  6 05:04:00 calvisitor-10-105-163-168 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  6 05:04:00 calvisitor-10-105-163-168 kernel[0]: [IOBluetoothHostController::setConfigState] calling registerService
Jul  6 08:32:37 authorMacBook-Pro kernel[0]: AppleActuatorHIDEventDriver: stop
Jul  6 08:32:37 authorMacBook-Pro kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  6 08:32:37 authorMacBook-Pro kernel[0]: [HID] [MT] AppleMultitouchDevice::start entered
Jul  6 08:32:39 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name CalendarAgent as bundle ID (this is expected for daemons without bundle ID
Jul  6 08:32:40 authorMacBook-Pro AddressBookSourceSync[36544]: [CardDAVPlugin-ERROR] -getPrincipalInfo:[_controller supportsRequestCompressionAtURL:https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/] Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline." UserInfo={NSUnderlyingError=0x7f8de0c0dc70 {Error Domain=kCFErrorDomainCFNetwork Code=-1009 "The Internet connection appears to be offline." UserInfo={NSErrorFailingURLStringKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, NSErrorFailingURLKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, _kCFStreamErrorCodeKey=8, _kCFStreamErrorDomainKey=12, NSLocalizedDescription=The Internet connection appears to be offline.}}, NSErrorFailingURLStringKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, NSErrorFailingURLKey=https://13957525385%40163.com@p28-contacts.icloud.com/874161398/principal/, _kCFStreamErrorDomainKey=12, _kCFStreamErrorCodeKey=8, NSLocalizedDescription=The Internet connection appears to be offline.}
Jul  6 08:32:45 authorMacBook-Pro netbiosd[36551]: Unable to start NetBIOS name service:
Jul  6 08:32:47 authorMacBook-Pro WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 08:33:10 calvisitor-10-105-163-253 corecaptured[36565]: doSaveChannels@286: Will write to: /Library/Logs/CrashReporter/CoreCapture/IOReporters/[2017-07-06_08,33,08.335034] - AuthFail:sts:5_rsn:0.xml
Jul  6 08:33:25 calvisitor-10-105-163-253 TCIM[30318]: [Accounts] Failed to update account with identifier 76FE6715-3D27-4F21-AA35-C88C1EA820E8, error: Error Domain=ABAddressBookErrorDomain Code=1002 "(null)"
Jul  6 08:33:53 calvisitor-10-105-163-253 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  6 08:35:08 calvisitor-10-105-163-253 corecaptured[36565]: Got an XPC error: Connection invalid
Jul  6 08:43:14 calvisitor-10-105-163-253 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 302, items, fQueryRetries, 0, fLastRetryTimestamp, 521048292.6
Jul  6 08:53:11 calvisitor-10-105-163-253 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 291, items, fQueryRetries, 0, fLastRetryTimestamp, 521048893.3
Jul  6 09:08:22 calvisitor-10-105-163-253 loginwindow[94]: -[SFLListManager(ServiceReplyProtocol) notifyChanges:toListWithIdentifier:] Notified of item changes to list with identifier com.apple.LSSharedFileList.RecentApplications
Jul  6 09:14:27 calvisitor-10-105-163-253 QQ[10018]: FA||Url||taskID[2019353614] dealloc
Jul  6 09:24:14 calvisitor-10-105-163-253 ksfetch[36728]: 2017-07-06 09:24:14.417 ksfetch[36728/0x7fff79824000] [lvl=2] main() ksfetch fetching URL (<NSMutableURLRequest: 0x100602220> { URL: https://tools.google.com/service/update2?cup2hreq=f5e83ec64ff3fc5533a3c206134a6517e274f9e1cb53df857e15049b6e4c9f8e&cup2key=7:1721929288 }) to folder:/tmp/KSOutOfProcessFetcher.aPWod5QMh1/download
Jul  6 09:24:14 calvisitor-10-105-163-253 GoogleSoftwareUpdateAgent[36726]: 2017-07-06 09:24:14.733 GoogleSoftwareUpdateAgent[36726/0x7000002a0000] [lvl=2] -[KSMultiUpdateAction performAction] KSPromptAction had no updates to apply.
Jul  6 09:31:18 calvisitor-10-105-163-253 WindowServer[184]: no sleep images for WillPowerOffWithImages
Jul  6 09:32:24 calvisitor-10-105-163-253 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  6 09:32:24 calvisitor-10-105-163-253 QQ[10018]: button report: 0x8002be0
Jul  6 09:32:37 calvisitor-10-105-163-253 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 12754 seconds.  Ignoring.
Jul  6 10:12:58 calvisitor-10-105-163-253 ChromeExistion[36773]: ChromeExistion main isUndetectWithCommand = 1
Jul  6 10:13:12 calvisitor-10-105-163-253 ChromeExistion[36775]: after trim url = https://www.google.com/_/chrome/newtab?rlz=1C5CHFA_enHK732HK732&espv=2&ie=UTF-8
Jul  6 10:13:16 calvisitor-10-105-163-253 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 10:17:44 calvisitor-10-105-163-253 ChromeExistion[36801]: ChromeExistion main strSendMsg = {"websitekey":false,"commandkey":true,"browserkey":true}
Jul  6 10:52:03 calvisitor-10-105-163-253 locationd[82]: Location icon should now be in state 'Active'
Jul  6 10:52:20 calvisitor-10-105-163-253 ChromeExistion[36846]: ChromeExistion main isUndetectWithCommand = 1
Jul  6 10:52:50 calvisitor-10-105-163-253 ChromeExistion[36852]: url host = www.baidu.com
Jul  6 10:53:30 calvisitor-10-105-163-253 ChromeExistion[36855]: the url = http://baike.baidu.com/item/%E8%93%9D%E9%87%87%E5%92%8C/462624?fr=aladdin
Jul  6 11:07:29 calvisitor-10-105-163-253 sharingd[30299]: 11:07:29.673 : Purged contact hashes
Jul  6 11:08:42 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  6 11:14:33 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  6 11:21:02 calvisitor-10-105-163-253 kernel[0]: ARPT: 739017.747240: ARPT: Wake Reason: Wake on Scan offload
Jul  6 11:21:02 calvisitor-10-105-163-253 kernel[0]: en0: channel changed to 1
Jul  6 11:21:02 calvisitor-10-105-163-253 kernel[0]: AirPort: Link Up on awdl0
Jul  6 11:21:06 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  6 11:21:06 authorMacBook-Pro configd[53]: network changed: DNS* Proxy
Jul  6 11:59:42 calvisitor-10-105-162-178 kernel[0]: en0: channel changed to 36,+1
Jul  6 12:00:10 calvisitor-10-105-162-178 sandboxd[129] ([36919]): com.apple.Addres(36919) deny network-outbound /private/var/run/mDNSResponder
Jul  6 12:00:53 authorMacBook-Pro CalendarAgent[279]: [com.apple.calendar.store.log.caldav.queue] [Adding [<CalDAVAccountRefreshQueueableOperation: 0x7fa11d67f3b0; Sequence: 0>] to failed operations.]
Jul  6 12:00:53 authorMacBook-Pro corecaptured[36918]: Received Capture Event
Jul  6 12:00:58 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_12,00,58.629029]-AirPortBrcm4360_Logs-007.txt, Current File [2017-07-06_12,00,58.629029]-AirPortBrcm4360_Logs-007.txt
Jul  6 12:01:10 authorMacBook-Pro kernel[0]: ARPT: 739157.867474: wlc_dump_aggfifo:
Jul  6 12:01:16 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  6 12:01:16 authorMacBook-Pro kernel[0]: ARPT: 739163.832381: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  6 12:01:17 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  6 12:02:25 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x4 to 0x8000000000000000
Jul  6 12:02:26 authorMacBook-Pro configd[53]: network changed: v6(en0-:2607:f140:6000:8:c6b3:1ff:fecd:467f) DNS- Proxy-
Jul  6 12:02:58 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  6 12:03:00 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_12,03,00.133649]-CCIOReporter-028.xml, Current File [2017-07-06_12,03,00.133649]-CCIOReporter-028.xml
Jul  6 12:03:00 authorMacBook-Pro kernel[0]: ARPT: 739241.687186: AQM agg results 0x8001 len hi/lo: 0x0 0x26 BAbitmap(0-3) 0 0 0 0
Jul  6 12:03:00 authorMacBook-Pro corecaptured[36918]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  6 12:03:02 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_12,03,02.449748]-AirPortBrcm4360_Logs-037.txt, Current File [2017-07-06_12,03,02.449748]-AirPortBrcm4360_Logs-037.txt
Jul  6 12:03:05 authorMacBook-Pro corecaptured[36918]: CCFile::captureLog Received Capture notice id: 1499367785.097211, reason = AuthFail:sts:5_rsn:0
Jul  6 12:03:07 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[36937]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  6 12:03:12 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc24039 112.90.78.169:8080
Jul  6 12:03:12 authorMacBook-Pro Dropbox[24019]: [0706/120312:WARNING:dns_config_service_posix.cc(306)] Failed to read DnsConfig.
Jul  6 12:03:12 authorMacBook-Pro kernel[0]: ARPT: 739253.582611: wlc_dump_aggfifo:
Jul  6 12:03:12 authorMacBook-Pro corecaptured[36918]: CCFile::captureLog Received Capture notice id: 1499367792.155080, reason = AuthFail:sts:5_rsn:0
Jul  6 12:03:12 authorMacBook-Pro corecaptured[36918]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_12,03,12.289973]-CCIOReporter-041.xml, Current File [2017-07-06_12,03,12.289973]-CCIOReporter-041.xml
Jul  6 12:03:37 authorMacBook-Pro kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - retries = 5
Jul  6 12:04:03 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  6 12:04:16 authorMacBook-Pro kernel[0]: ARPT: 739295.354731: wl0: Roamed or switched channel, reason #4, bssid f8:4f:57:3b:ea:b2, last RSSI -77
Jul  6 12:04:16 authorMacBook-Pro kernel[0]: en0: BSSID changed to f8:4f:57:3b:ea:b2
Jul  6 12:05:06 authorMacBook-Pro kernel[0]: in6_unlink_ifa: IPv6 address 0x77c911454f1523ab has no prefix
Jul  6 12:05:41 calvisitor-10-105-162-178 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2375 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  6 12:05:46 calvisitor-10-105-162-178 kernel[0]: ARPT: 739357.156234: wl0: setup_keepalive: Seq: 1852166454, Ack: 1229910694, Win size: 4096
Jul  6 12:17:22 calvisitor-10-105-162-178 kernel[0]: ARPT: 739359.663674: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  6 12:17:22 calvisitor-10-105-162-178 kernel[0]: en0: BSSID changed to 88:75:56:a0:95:ed
Jul  6 12:30:59 calvisitor-10-105-162-178 kernel[0]: ARPT: 739420.595498: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  6 12:31:58 calvisitor-10-105-162-178 kernel[0]: ARPT: 739481.576701: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  6 12:58:15 calvisitor-10-105-162-178 kernel[0]: ARPT: 739549.504820: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  6 12:59:11 calvisitor-10-105-162-178 kernel[0]: ARPT: 739605.015490: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:cc53:3e31:ccd8:11d4
Jul  6 13:11:53 calvisitor-10-105-162-178 kernel[0]: Previous sleep cause: 5
Jul  6 13:12:52 calvisitor-10-105-162-178 kernel[0]: ARPT: 739668.778627: AirPort_Brcm43xx::powerChange: System Sleep
Jul  6 13:39:08 calvisitor-10-105-162-178 Mail[11203]: tcp_connection_destination_perform_socket_connect 45238 connectx to 123.125.50.30:993@0 failed: [50] Network is down
Jul  6 14:07:50 authorMacBook-Pro QQ[10018]: tcp_connection_handle_connect_conditions_bad 24150 failed: 3 - No network route
Jul  6 14:08:48 authorMacBook-Pro kernel[0]: hibernate_rebuild started
Jul  6 14:08:49 authorMacBook-Pro blued[85]: INIT -- Host controller is published
Jul  6 14:09:31 authorMacBook-Pro corecaptured[37027]: Received Capture Event
Jul  6 14:09:32 authorMacBook-Pro corecaptured[37027]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  6 14:15:54 authorMacBook-Pro CalendarAgent[279]: [com.apple.calendar.store.log.caldav.queue] [Adding [<CalDAVAccountRefreshQueueableOperation: 0x7fa11d67f3b0; Sequence: 0>] to failed operations.]
Jul  6 14:15:59 authorMacBook-Pro corecaptured[37027]: Received Capture Event
Jul  6 14:15:59 authorMacBook-Pro corecaptured[37027]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_14,15,59.644892]-CCIOReporter-007.xml, Current File [2017-07-06_14,15,59.644892]-CCIOReporter-007.xml
Jul  6 14:15:59 authorMacBook-Pro corecaptured[37027]: CCFile::captureLogRun Skipping current file Dir file [2017-07-06_14,15,59.726497]-io80211Family-008.pcapng, Current File [2017-07-06_14,15,59.726497]-io80211Family-008.pcapng
Jul  6 14:16:06 calvisitor-10-105-162-178 sharingd[30299]: 14:16:06.179 : Scanning mode Contacts Only
Jul  6 14:16:10 calvisitor-10-105-162-178 kernel[0]: Sandbox: com.apple.Addres(37034) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  6 14:17:00 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.user.501): Service "com.apple.xpc.launchd.unmanaged.loginwindow.94" tried to hijack endpoint "com.apple.tsm.uiserver" from owner: com.apple.SystemUIServer.agent
Jul  6 14:17:14 calvisitor-10-105-162-178 kernel[0]: ARPT: 740034.911245: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  6 14:29:38 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  6 14:43:10 calvisitor-10-105-162-178 kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  6 14:43:22 calvisitor-10-105-162-178 com.apple.AddressBook.InternetAccountsBridge[37051]: dnssd_clientstub ConnectToServer: connect() failed path:/var/run/mDNSResponder Socket:4 Err:-1 Errno:1 Operation not permitted
Jul  6 14:44:08 calvisitor-10-105-162-178 kernel[0]: PM response took 1999 ms (54, powerd)
Jul  6 14:56:48 calvisitor-10-105-162-178 kernel[0]: en0: channel changed to 36,+1
Jul  6 14:56:48 calvisitor-10-105-162-178 kernel[0]: RTC: Maintenance 2017/7/6 21:56:47, sleep 2017/7/6 21:44:10
Jul  6 14:56:48 calvisitor-10-105-162-178 kernel[0]: Previous sleep cause: 5
Jul  6 14:57:16 calvisitor-10-105-162-178 ksfetch[37061]: 2017-07-06 14:57:16.261 ksfetch[37061/0x7fff79824000] [lvl=2] KSHelperReceiveAllData() KSHelperTool read 1999 bytes from stdin.
Jul  6 14:57:16 calvisitor-10-105-162-178 GoogleSoftwareUpdateAgent[37059]: 2017-07-06 14:57:16.661 GoogleSoftwareUpdateAgent[37059/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher(PrivateMethods) helperDidTerminate:] KSOutOfProcessFetcher fetch ended for URL: "https://tools.google.com/service/update2?cup2hreq=37fbcb7ab6829be04567976e3212d7a67627aef11546f8b7013d4cffaf51f739&cup2key=7:4200177539"
Jul  6 14:57:16 calvisitor-10-105-162-178 GoogleSoftwareUpdateAgent[37059]: 2017-07-06 14:57:16.667 GoogleSoftwareUpdateAgent[37059/0x7000002a0000] [lvl=2] -[KSAgentApp(KeystoneDelegate) updateEngineFinishedWithErrors:] Keystone finished: errors=0
Jul  6 15:10:30 calvisitor-10-105-162-178 kernel[0]: ARPT: 740174.102665: wl0: MDNS: 0 SRV Recs, 0 TXT Recs
Jul  6 15:24:08 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  6 15:30:53 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  6 15:30:54 calvisitor-10-105-162-178 kernel[0]: ARPT: 740226.968934: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  6 15:45:08 calvisitor-10-105-162-178 kernel[0]: ARPT: 740345.497593: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  6 15:45:08 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  6 15:45:08 calvisitor-10-105-162-178 kernel[0]: in6_unlink_ifa: IPv6 address 0x77c911454f152b8b has no prefix
Jul  6 15:58:40 calvisitor-10-105-162-178 kernel[0]: ARPT: 740352.115529: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  6 16:12:15 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  6 16:12:15 calvisitor-10-105-162-178 kernel[0]: Previous sleep cause: 5
Jul  6 16:12:15 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-06 23:12:15 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  6 16:12:20 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  6 16:15:50 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  6 16:16:11 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  6 16:17:36 authorMacBook-Pro kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  6 16:17:39 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  6 16:18:17 calvisitor-10-105-162-178 kernel[0]: ARPT: 740501.982555: wl0: MDNS: IPV6 Addr: fe80:0:0:0:c6b3:1ff:fecd:467f
Jul  6 16:29:37 calvisitor-10-105-162-178 kernel[0]: ARPT: 740504.547655: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  6 16:29:37 calvisitor-10-105-162-178 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  6 16:29:37 authorMacBook-Pro networkd[195]: __42-[NETClientConnection evaluateCrazyIvan46]_block_invoke CI46 - Hit by torpedo! QQ.10018 tc24283 119.81.102.227:80
Jul  6 16:29:42 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  6 16:29:42 authorMacBook-Pro corecaptured[37102]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  6 16:29:43 authorMacBook-Pro corecaptured[37102]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  6 16:29:48 authorMacBook-Pro networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x8000000000000000 to 0x4
Jul  6 16:29:58 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  6 16:43:27 calvisitor-10-105-162-178 kernel[0]: in6_unlink_ifa: IPv6 address 0x77c911453a6db3ab has no prefix
Jul  6 16:43:37 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  6 17:23:42 calvisitor-10-105-162-178 kernel[0]: ARPT: 740631.402908: IOPMPowerSource Information: onWake,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 5802,
Jul  6 17:23:43 calvisitor-10-105-162-178 sharingd[30299]: 17:23:43.193 : Scanning mode Contacts Only
Jul  6 17:23:46 calvisitor-10-105-162-178 QQ[10018]: DB Error: 1 "no such table: tb_c2cMsg_2658655094"
Jul  6 17:28:48 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.37146): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.History.xpc/Contents/MacOS/com.apple.Safari.History error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  6 17:34:52 calvisitor-10-105-162-178 QQ[10018]: FA||Url||taskID[2019353659] dealloc
Jul  6 17:48:02 calvisitor-10-105-162-178 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 302, items, fQueryRetries, 0, fLastRetryTimestamp, 521080983.6
Jul  6 17:57:59 calvisitor-10-105-162-178 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 300, items, fQueryRetries, 0, fLastRetryTimestamp, 521081581.2
Jul  6 18:05:46 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 18:07:04 calvisitor-10-105-162-178 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f995050b170>.
Jul  6 18:09:02 calvisitor-10-105-162-178 kernel[0]: Sandbox: com.apple.WebKit(9854) deny(1) file-read-data /private/etc/hosts
Jul  6 18:09:43 calvisitor-10-105-162-178 QQ[10018]: FA||Url||taskID[2019353666] dealloc
Jul  6 18:22:57 calvisitor-10-105-162-178 AirPlayUIAgent[415]: 2017-07-06 06:22:57.163367 PM [AirPlayUIAgent] BecomingInactive: NSWorkspaceWillSleepNotification
Jul  6 18:22:57 calvisitor-10-105-162-178 QQ[10018]: 2017/07/06 18:22:57.953 | I | VoipWrapper  | DAVEngineImpl.cpp:1400:Close             | close video chat. llFriendUIN = 1742124257.
Jul  6 18:23:11 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 7518 seconds.  Ignoring.
Jul  6 18:23:43 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 258 seconds.  Ignoring.
Jul  6 18:36:51 calvisitor-10-105-162-178 kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  6 18:37:07 calvisitor-10-105-162-178 kernel[0]: Sandbox: com.apple.Addres(37204) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  6 18:37:20 calvisitor-10-105-162-178 kernel[0]: full wake request (reason 2) 30914 ms
Jul  6 18:37:30 calvisitor-10-105-162-178 sharingd[30299]: 18:37:30.916 : BTLE scanner Powered Off
Jul  6 18:37:37 calvisitor-10-105-162-178 QQ[10018]: ############################## _getSysMsgList
Jul  6 18:50:29 calvisitor-10-105-162-178 kernel[0]: ARPT: 744319.484045: wl0: wl_update_tcpkeep_seq: Original Seq: 1092633597, Ack: 2572586285, Win size: 4096
Jul  6 18:50:29 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 65594 seconds.  Ignoring.
Jul  6 18:50:29 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5880 seconds.  Ignoring.
Jul  6 18:50:29 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 16680 seconds.  Ignoring.
Jul  6 18:51:42 calvisitor-10-105-162-178 kernel[0]: kern_open_file_for_direct_io(0)
Jul  6 19:04:07 calvisitor-10-105-162-178 QQ[10018]: ############################## _getSysMsgList
Jul  6 19:04:07 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  6 19:04:46 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 15823 seconds.  Ignoring.
Jul  6 19:17:46 calvisitor-10-105-162-178 kernel[0]: Wake reason: RTC (Alarm)
Jul  6 19:17:46 calvisitor-10-105-162-178 sharingd[30299]: 19:17:46.405 : BTLE scanner Powered Off
Jul  6 19:17:46 calvisitor-10-105-162-178 kernel[0]: ARPT: 744472.877165: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  6 19:18:27 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 15002 seconds.  Ignoring.
Jul  6 19:19:43 calvisitor-10-105-162-178 kernel[0]: ARPT: 744589.508896: wl0: setup_keepalive: Remote IP: 17.249.28.35
Jul  6 19:31:29 calvisitor-10-105-162-178 kernel[0]: ARPT: 744593.160590: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 1529267953, Ack 4054195714, Win size 380
Jul  6 19:31:29 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  6 19:31:29 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  6 19:31:29 calvisitor-10-105-162-178 kernel[0]: ARPT: 744595.284508: AirPort_Brcm43xx::platformWoWEnable: WWEN[disable]
Jul  6 19:31:39 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 524667 seconds.  Ignoring.
Jul  6 19:31:41 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 63122 seconds.  Ignoring.
Jul  6 19:31:49 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  6 19:31:49 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 524657 seconds.  Ignoring.
Jul  6 19:32:24 calvisitor-10-105-162-178 kernel[0]: ARPT: 744650.016431: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:f882:21d2:d1af:f093
Jul  6 19:45:06 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  6 19:45:16 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2593 seconds.  Ignoring.
Jul  6 19:45:26 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 523840 seconds.  Ignoring.
Jul  6 19:45:43 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 62280 seconds.  Ignoring.
Jul  6 19:58:57 calvisitor-10-105-162-178 kernel[0]: PM response took 129 ms (10018, QQ)
Jul  6 20:03:04 calvisitor-10-105-162-178 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  6 20:03:05 calvisitor-10-105-162-178 sharingd[30299]: 20:03:05.179 : BTLE scanner Powered Off
Jul  6 20:03:05 calvisitor-10-105-162-178 QQ[10018]: button report: 0x80039B7
Jul  6 20:03:23 calvisitor-10-105-162-178 com.apple.AddressBook.InternetAccountsBridge[37261]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  6 20:04:04 calvisitor-10-105-162-178 secd[276]:  SOSAccountThisDeviceCanSyncWithCircle sync with device failure: Error Domain=com.apple.security.sos.error Code=1035 "Account identity not set" UserInfo={NSDescription=Account identity not set}
Jul  6 20:05:04 calvisitor-10-105-162-178 WeChat[24144]: jemmytest
Jul  6 20:05:07 calvisitor-10-105-162-178 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  6 20:05:36 calvisitor-10-105-162-178 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.queue] [Adding [<CalDAVAccountRefreshQueueableOperation: 0x7fa11d73f960; Sequence: 0>] to failed operations.]
Jul  6 20:14:33 calvisitor-10-105-162-178 QQ[10018]: FA||Url||taskID[2019353677] dealloc
Jul  6 20:30:35 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 20:35:33 calvisitor-10-105-162-178 WeChat[24144]: jemmytest
Jul  6 20:38:15 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Active'
Jul  6 20:46:03 calvisitor-10-105-162-178 GoogleSoftwareUpdateAgent[37316]: 2017-07-06 20:46:03.869 GoogleSoftwareUpdateAgent[37316/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher beginFetchWithDelegate:] KSOutOfProcessFetcher start fetch from URL: "https://tools.google.com/service/update2?cup2hreq=5e15fbe422c816bef7c133cfffdb516e16923579b9be2dfae4d7d8d211b25017&cup2key=7:780377214"
Jul  6 20:53:41 calvisitor-10-105-162-178 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 291, items, fQueryRetries, 0, fLastRetryTimestamp, 521092126.3
Jul  6 21:00:02 calvisitor-10-105-162-178 locationd[82]: NETWORK: no response from server, reachability, 2, queryRetries, 2
Jul  6 21:03:09 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 21:08:02 calvisitor-10-105-162-178 Preview[11512]: Page bounds {{0, 0}, {400, 400}}
Jul  6 21:22:31 calvisitor-10-105-162-178 WeChat[24144]: Failed to connect (titleField) outlet from (MMSessionPickerChoosenRowView) to (NSTextField): missing setter or instance variable
Jul  6 22:05:30 calvisitor-10-105-162-178 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.queue] [Account xpc_ben@163.com@https://caldav.163.com/caldav/principals/users/xpc_ben%40163.com/ timed out when executing operation: <CalDAVAccountRefreshQueueableOperation: 0x7fa11f9f2290; Sequence: 0>]
Jul  6 22:26:19 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 22:33:18 calvisitor-10-105-162-178 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.queue] [Account refresh failed with error: Error Domain=CoreDAVHTTPStatusErrorDomain Code=502 "(null)" UserInfo={AccountName=163, CalDAVErrFromRefresh=YES, CoreDAVHTTPHeaders=<CFBasicHash 0x7fa11fe7a810 [0x7fff7abc1440]>{type = immutable dict, count = 5, entries => 0 : Connection = <CFString 0x7fff7ab1aea0 [0x7fff7abc1440]>{contents = "keep-alive"} 3 : Content-Type = text/html 4 : Content-Length = 166 5 : Server = nginx 6 : Date = <CFString 0x7fa11ac2ab80 [0x7fff7abc1440]>{contents = "Fri, 07 Jul 2017 05:32:43 GMT"} } }]
Jul  6 22:37:40 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  6 23:00:45 calvisitor-10-105-162-178 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  6 23:28:39 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Inactive'
Jul  6 23:33:20 calvisitor-10-105-162-178 Preview[11512]: Page bounds {{0, 0}, {400, 400}}
Jul  6 23:33:55 calvisitor-10-105-162-178 SpotlightNetHelper[352]: CFPasteboardRef CFPasteboardCreate(CFAllocatorRef, CFStringRef) : failed to create global data
Jul  7 00:01:59 calvisitor-10-105-162-178 kernel[0]: Sandbox: SpotlightNetHelp(352) deny(1) ipc-posix-shm-read-data CFPBS:186A7:
Jul  7 00:02:27 calvisitor-10-105-162-178 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2438 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  7 00:09:34 calvisitor-10-105-162-178 QQ[10018]: FA||Url||taskID[2019353724] dealloc
Jul  7 00:10:01 calvisitor-10-105-162-178 taskgated[273]: no application identifier provided, can't use provisioning profiles [pid=37563]
Jul  7 00:12:09 calvisitor-10-105-162-178 SpotlightNetHelper[352]: tcp_connection_destination_handle_tls_close_notify 111 closing socket due to TLS CLOSE_NOTIFY alert
Jul  7 00:24:41 calvisitor-10-105-162-178 com.apple.WebKit.Networking[9854]: CFNetwork SSLHandshake failed (-9802)
Jul  7 00:26:36 calvisitor-10-105-162-178 Preview[11512]: Unable to simultaneously satisfy constraints: ( "<NSLayoutConstraint:0x7f8efa7db140 H:[NSImageView:0x7f8efa7db900(38)]>", "<NSLayoutConstraint:0x7f8efa7cbe00 H:|-(14)-[NSImageView:0x7f8efa7db900]   (Names: PageItemCell:0x7f8efa7cb450, '|':PageItemCell:0x7f8efa7cb450 )>", "<NSLayoutConstraint:0x7f8f17556f20 'NSView-Encapsulated-Layout-Width' H:[PageItemCell(73)]   (Names: PageItemCell:0x7f8efa7cb450 )>", "<NSLayoutConstraint:0x7f8efa7dc1c0 H:[NSImageView:0x7f8efa7db900]-(10)-[NSTextField:0x7f8efa7da9a0]>", "<NSLayoutConstraint:0x7f8efa7cbf70 H:[NSTextField:0x7f8f02f1da90]-(14)-|   (Names: PageItemCell:0x7f8efa7cb450, '|':PageItemCell:0x7f8efa7cb450 )>", "<NSLayoutConstraint:0x7f8efa7dc350 H:[NSTextField:0x7f8efa7da9a0]-(>=NSSpace(8))-[NSTextField:0x7f8f02f1da90]>" )  Will attempt to recover by breaking constraint <NSLayoutConstraint:0x7f8efa7db140 H:[NSImageView:0x7f8efa7db900(38)]>  Set the NSUserDefault NSConstraintBasedLayoutVisualizeMutuallyExclusiveConstraints to YES to have -[NSWindow visualizeConstraints:] automatically called when this happens.  And/or, break on objc_exception_throw to catch this in the debugger.
Jul  7 00:26:41 calvisitor-10-105-162-178 Preview[11512]: Unable to simultaneously satisfy constraints: ( "<NSLayoutConstraint:0x7f8efb89e920 H:[NSImageView:0x7f8efb89d5d0(38)]>", "<NSLayoutConstraint:0x7f8efb89aac0 H:|-(14)-[NSImageView:0x7f8efb89d5d0]   (Names: PageItemCell:0x7f8efb898930, '|':PageItemCell:0x7f8efb898930 )>", "<NSLayoutConstraint:0x7f8f071a6c20 'NSView-Encapsulated-Layout-Width' H:[PageItemCell(73)]   (Names: PageItemCell:0x7f8efb898930 )>", "<NSLayoutConstraint:0x7f8efb89d8a0 H:[NSImageView:0x7f8efb89d5d0]-(10)-[NSTextField:0x7f8efb89d250]>", "<NSLayoutConstraint:0x7f8efb8980e0 H:[NSTextField:0x7f8efb89e7a0]-(14)-|   (Names: PageItemCell:0x7f8efb898930, '|':PageItemCell:0x7f8efb898930 )>", "<NSLayoutConstraint:0x7f8efb89ba20 H:[NSTextField:0x7f8efb89d250]-(>=NSSpace(8))-[NSTextField:0x7f8efb89e7a0]>" )  Will attempt to recover by breaking constraint <NSLayoutConstraint:0x7f8efb89e920 H:[NSImageView:0x7f8efb89d5d0(38)]>  Set the NSUserDefault NSConstraintBasedLayoutVisualizeMutuallyExclusiveConstraints to YES to have -[NSWindow visualizeConstraints:] automatically called when this happens.  And/or, break on objc_exception_throw to catch this in the debugger.
Jul  7 00:30:06 calvisitor-10-105-162-178 syslogd[44]: Configuration Notice: ASL Module "com.apple.authkit.osx.asl" sharing output destination "/var/log/Accounts" with ASL Module "com.apple.Accounts". Output parameters from ASL Module "com.apple.Accounts" override any specified in ASL Module "com.apple.authkit.osx.asl".
Jul  7 00:43:06 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 00:43:09 calvisitor-10-105-162-178 imagent[355]: <IMMacNotificationCenterManager: 0x7fdcc9d16380>:    NC Disabled: NO
Jul  7 00:43:09 calvisitor-10-105-162-178 identityservicesd[272]: <IMMacNotificationCenterManager: 0x7ff1b2d17980>:    NC Disabled: NO
Jul  7 00:52:55 authorMacBook-Pro corecaptured[37602]: CCFile::copyFile fileName is [2017-07-07_00,52,55.450817]-CCIOReporter-001.xml, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/OneStats//[2017-07-07_00,52,55.450817]-CCIOReporter-001.xml, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-07_00,52,54.449889]=AuthFail:sts:5_rsn:0/OneStats//[2017-07-07_00,52,55.450817]-CCIOReporter-001.xml
Jul  7 00:52:58 authorMacBook-Pro symptomsd[215]: -[NetworkAnalyticsEngine _writeJournalRecord:fromCellFingerprint:key:atLOI:ofKind:lqm:isFaulty:] Hashing of the primary key failed. Dropping the journal record.
Jul  7 00:52:58 authorMacBook-Pro UserEventAgent[43]: Captive: [CNInfoNetworkActive:1748] en0: SSID 'CalVisitor' making interface primary (cache indicates network not captive)
Jul  7 00:53:03 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 43840 seconds.  Ignoring.
Jul  7 00:53:09 calvisitor-10-105-162-178 mds[63]: (DiskStore.Normal:2382) 20cb04f 1.000086
Jul  7 00:53:19 calvisitor-10-105-162-178 sandboxd[129] ([37617]): com.apple.Addres(37617) deny network-outbound /private/var/run/mDNSResponder
Jul  7 00:53:26 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 5703 seconds.  Ignoring.
Jul  7 01:06:34 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 01:33:49 calvisitor-10-105-162-178 kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  7 01:34:46 calvisitor-10-105-162-178 kernel[0]: ARPT: 761864.513194: AirPort_Brcm43xx::powerChange: System Sleep
Jul  7 01:47:40 calvisitor-10-105-162-178 GoogleSoftwareUpdateAgent[37644]: 2017-07-07 01:47:40.090 GoogleSoftwareUpdateAgent[37644/0x7000002a0000] [lvl=2] -[KSOutOfProcessFetcher beginFetchWithDelegate:] KSOutOfProcessFetcher start fetch from URL: "https://tools.google.com/service/update2?cup2hreq=c30943ccd5e0a03e93b6be3e2b7e2127989f08f1bde99263ffee091de8b8bc39&cup2key=7:1039900771"
Jul  7 02:01:04 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  7 02:14:41 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 02:15:01 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 38922 seconds.  Ignoring.
Jul  7 02:15:01 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 893 seconds.  Ignoring.
Jul  7 02:28:19 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 02:42:24 calvisitor-10-105-162-178 sandboxd[129] ([37682]): com.apple.Addres(37682) deny network-outbound /private/var/run/mDNSResponder
Jul  7 02:42:27 calvisitor-10-105-162-178 com.apple.AddressBook.InternetAccountsBridge[37682]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  7 02:55:51 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 1 Memory pressure state: 0
Jul  7 02:56:01 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 498005 seconds.  Ignoring.
Jul  7 03:09:18 calvisitor-10-105-162-178 kernel[0]: ARPT: 762302.122693: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  7 03:09:38 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 35733 seconds.  Ignoring.
Jul  7 03:10:18 calvisitor-10-105-162-178 kernel[0]: ARPT: 762363.637095: AirPort_Brcm43xx::powerChange: System Sleep
Jul  7 03:22:55 calvisitor-10-105-162-178 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  7 03:22:55 calvisitor-10-105-162-178 kernel[0]: ARPT: 762366.143164: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  7 03:23:15 calvisitor-10-105-162-178 com.apple.AddressBook.InternetAccountsBridge[37700]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 2
Jul  7 03:36:32 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  7 03:36:32 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  7 03:50:09 calvisitor-10-105-162-178 kernel[0]: ARPT: 762484.281874: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  7 03:50:19 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 33204 seconds.  Ignoring.
Jul  7 03:50:29 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 33282 seconds.  Ignoring.
Jul  7 03:51:08 calvisitor-10-105-162-178 kernel[0]: ARPT: 762543.171617: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  7 04:04:43 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.suggestions.harvest: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 106 seconds.  Ignoring.
Jul  7 04:04:43 calvisitor-10-105-162-178 kernel[0]: ARPT: 762603.017378: wl0: setup_keepalive: Local port: 62991, Remote port: 443
Jul  7 04:17:24 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  7 04:17:33 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 31570 seconds.  Ignoring.
Jul  7 04:17:37 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Active'
Jul  7 04:17:52 calvisitor-10-105-162-178 sandboxd[129] ([37725]): com.apple.Addres(37725) deny network-outbound /private/var/run/mDNSResponder
Jul  7 04:31:01 calvisitor-10-105-162-178 kernel[0]: AirPort: Link Down on awdl0. Reason 1 (Unspecified).
Jul  7 04:44:38 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 491488 seconds.  Ignoring.
Jul  7 04:44:48 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1002 seconds.  Ignoring.
Jul  7 04:44:48 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1002 seconds.  Ignoring.
Jul  7 04:58:15 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  7 04:58:15 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 11 unplug = 0
Jul  7 04:58:16 calvisitor-10-105-162-178 kernel[0]: AirPort: Link Up on awdl0
Jul  7 04:58:35 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 29108 seconds.  Ignoring.
Jul  7 04:58:36 calvisitor-10-105-162-178 com.apple.AddressBook.InternetAccountsBridge[37745]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  7 04:58:40 calvisitor-10-105-162-178 sandboxd[129] ([37745]): com.apple.Addres(37745) deny network-outbound /private/var/run/mDNSResponder
Jul  7 05:11:52 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::wakeEventHandlerThread
Jul  7 05:12:46 calvisitor-10-105-162-178 kernel[0]: ARPT: 762900.518967: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:3065:65eb:758e:972a
Jul  7 05:25:49 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 1065 seconds.  Ignoring.
Jul  7 05:26:27 calvisitor-10-105-162-178 kernel[0]: ARPT: 762962.511796: AirPort_Brcm43xx::powerChange: System Sleep
Jul  7 05:39:27 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 26744 seconds.  Ignoring.
Jul  7 05:39:27 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 26656 seconds.  Ignoring.
Jul  7 05:40:03 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 488163 seconds.  Ignoring.
Jul  7 05:52:44 calvisitor-10-105-162-178 kernel[0]: ARPT: 763023.568413: AirPort_Brcm43xx::syncPowerState: WWEN[enabled]
Jul  7 05:52:44 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 25947 seconds.  Ignoring.
Jul  7 06:06:21 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  7 06:06:21 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 25042 seconds.  Ignoring.
Jul  7 06:07:14 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 25077 seconds.  Ignoring.
Jul  7 06:48:46 authorMacBook-Pro corecaptured[37783]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  7 07:01:09 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 21754 seconds.  Ignoring.
Jul  7 07:01:14 calvisitor-10-105-162-178 corecaptured[37799]: CCFile::captureLogRun Skipping current file Dir file [2017-07-07_07,01,14.472939]-CCIOReporter-002.xml, Current File [2017-07-07_07,01,14.472939]-CCIOReporter-002.xml
Jul  7 07:15:32 calvisitor-10-105-162-178 kernel[0]: ARPT: 763490.115579: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  7 07:16:35 authorMacBook-Pro configd[53]: setting hostname to "authorMacBook-Pro.local"
Jul  7 07:16:48 calvisitor-10-105-162-178 corecaptured[37799]: CCDataTap::profileRemoved, Owner: com.apple.driver.AirPort.Brcm4360.0, Name: StateSnapshots
Jul  7 07:17:17 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 20786 seconds.  Ignoring.
Jul  7 07:30:15 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 1 milliseconds
Jul  7 07:30:15 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  7 07:30:25 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 481541 seconds.  Ignoring.
Jul  7 07:30:35 calvisitor-10-105-162-178 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  7 07:59:26 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltNHIType2::prePCIWake - power up complete - took 1 us
Jul  7 07:59:26 calvisitor-10-105-162-178 configd[53]: setting hostname to "authorMacBook-Pro.local"
Jul  7 07:59:26 authorMacBook-Pro kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  7 07:59:31 calvisitor-10-105-162-178 sandboxd[129] ([10018]): QQ(10018) deny mach-lookup com.apple.networking.captivenetworksupport
Jul  7 07:59:46 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 479780 seconds.  Ignoring.
Jul  7 08:28:42 authorMacBook-Pro symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  7 08:28:48 calvisitor-10-105-162-178 networkd[195]: nw_nat64_post_new_ifstate successfully changed NAT64 ifstate from 0x4 to 0x8000000000000000
Jul  7 08:42:41 calvisitor-10-105-162-178 com.apple.CDScheduler[43]: Thermal pressure state: 0 Memory pressure state: 0
Jul  7 09:09:36 calvisitor-10-105-162-178 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-07 16:09:36 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  7 09:09:55 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 14028 seconds.  Ignoring.
Jul  7 09:10:35 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 09:23:13 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 474773 seconds.  Ignoring.
Jul  7 09:37:11 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 473935 seconds.  Ignoring.
Jul  7 09:50:48 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 11575 seconds.  Ignoring.
Jul  7 09:51:24 calvisitor-10-105-162-178 kernel[0]: ARPT: 764299.017125: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:9cb8:f7f2:7c03:f956
Jul  7 10:04:25 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 472301 seconds.  Ignoring.
Jul  7 10:04:25 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 845 seconds.  Ignoring.
Jul  7 10:05:03 calvisitor-10-105-162-178 kernel[0]: ARPT: 764361.057441: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:9cb8:f7f2:7c03:f956
Jul  7 10:17:44 calvisitor-10-105-162-178 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 9959 seconds.  Ignoring.
Jul  7 10:17:44 calvisitor-10-105-162-178 kernel[0]: AirPort: Link Up on awdl0
Jul  7 10:18:03 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 10028 seconds.  Ignoring.
Jul  7 10:18:45 calvisitor-10-105-162-178 kernel[0]: ARPT: 764427.640542: wl0: setup_keepalive: Seq: 204730741, Ack: 2772623181, Win size: 4096
Jul  7 10:31:22 calvisitor-10-105-162-178 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  7 10:31:22 calvisitor-10-105-162-178 kernel[0]: RTC: Maintenance 2017/7/7 17:31:21, sleep 2017/7/7 17:18:49
Jul  7 10:31:32 calvisitor-10-105-162-178 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 9219 seconds.  Ignoring.
Jul  7 10:37:43 calvisitor-10-105-162-178 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  7 10:37:43 calvisitor-10-105-162-178 QQ[10018]: ############################## _getSysMsgList
Jul  7 10:37:43 calvisitor-10-105-162-178 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  7 10:37:43 calvisitor-10-105-162-178 kernel[0]: en0: channel changed to 1
Jul  7 10:38:06 calvisitor-10-105-162-178 Mail[11203]: Unrecognized XSSimpleTypeDefinition: OneOff
Jul  7 10:38:10 calvisitor-10-105-162-178 QQ[10018]: DB Path: /Users/xpc/Library/Containers/com.tencent.qq/Data/Documents/contents/916639562/QQ.db
Jul  7 10:38:23 calvisitor-10-105-162-178 UserEventAgent[258]: Could not get event name for stream/token: com.apple.xpc.activity/4505: 132: Request for stale data
Jul  7 10:54:41 calvisitor-10-105-162-178 ksfetch[37925]: 2017-07-07 10:54:41.296 ksfetch[37925/0x7fff79824000] [lvl=2] KSHelperReceiveAllData() KSHelperTool read 1926 bytes from stdin.
Jul  7 10:54:41 calvisitor-10-105-162-178 GoogleSoftwareUpdateAgent[37924]: 2017-07-07 10:54:41.875 GoogleSoftwareUpdateAgent[37924/0x7000002a0000] [lvl=2] -[KSUpdateCheckAction performAction] KSUpdateCheckAction starting update check for ticket(s): {( <KSTicket:0x100365950 productID=com.google.Chrome version=59.0.3071.115 xc=<KSPathExistenceChecker:0x10036e950 path=/Applications/Google Chrome.app> serverType=Omaha url=https://tools.google.com/service/update2 creationDate=2017-02-18 15:41:18 tagPath=/Applications/Google Chrome.app/Contents/Info.plist tagKey=KSChannelID brandPath=/Users/xpc/Library/Google/Google Chrome Brand.plist brandKey=KSBrandID versionPath=/Applications/Google Chrome.app/Contents/Info.plist versionKey=KSVersion cohort=1:1y5: cohortName=Stable ticketVersion=1 > )} Using server: <KSOmahaServer:0x100243f20 engine=<KSUpdateEngine:0x1007161b0> >
Jul  7 10:57:19 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Inactive'
Jul  7 11:01:11 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 11:22:27 calvisitor-10-105-162-178 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 294, items, fQueryRetries, 0, fLastRetryTimestamp, 521144227.4
Jul  7 11:28:11 calvisitor-10-105-162-178 com.apple.ncplugin.weather[37956]: Error in CoreDragRemoveTrackingHandler: -1856
Jul  7 11:28:44 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.37963): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.History.xpc/Contents/MacOS/com.apple.Safari.History error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  7 11:48:06 calvisitor-10-105-162-178 com.apple.WebKit.WebContent[32778]: [11:48:06.869] FigAgglomeratorSetObjectForKey signalled err=-16020 (kFigStringConformerError_ParamErr) (NULL key) at /Library/Caches/com.apple.xbs/Sources/CoreMedia/CoreMedia-1731.15.207/Prototypes/LegibleOutput/FigAgglomerator.c line 92
Jul  7 11:57:06 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.37999): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.ImageDecoder.xpc/Contents/MacOS/com.apple.Safari.ImageDecoder error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  7 11:57:23 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Active'
Jul  7 12:12:06 calvisitor-10-105-162-178 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.user.501): Service "com.apple.xpc.launchd.unmanaged.loginwindow.94" tried to hijack endpoint "com.apple.tsm.uiserver" from owner: com.apple.SystemUIServer.agent
Jul  7 12:12:27 calvisitor-10-105-162-178 locationd[82]: Location icon should now be in state 'Active'
Jul  7 12:14:35 calvisitor-10-105-162-178 kernel[0]: ARPT: 770226.223664: IOPMPowerSource Information: onWake,  SleepType: Normal Sleep,  'ExternalConnected': Yes, 'TimeRemaining': 0,
Jul  7 12:14:38 calvisitor-10-105-162-178 com.apple.SecurityServer[80]: Session 101800 destroyed
Jul  7 12:15:44 calvisitor-10-105-162-178 quicklookd[38023]: Error returned from iconservicesagent: (null)
Jul  7 12:15:44 calvisitor-10-105-162-178 quicklookd[38023]: Error returned from iconservicesagent: (null)
Jul  7 12:15:59 calvisitor-10-105-162-178 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 12:16:28 calvisitor-10-105-162-178 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f995070be80>.
Jul  7 12:16:28 calvisitor-10-105-162-178 quicklookd[38023]: Error returned from iconservicesagent: (null)
Jul  7 12:16:28 calvisitor-10-105-162-178 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f995060a270>.
Jul  7 12:17:49 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 12:20:19 calvisitor-10-105-162-178 kernel[0]: TBT W (2): 0x0040 [x]
Jul  7 12:20:25 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  7 12:20:41 calvisitor-10-105-162-178 AddressBookSourceSync[38055]: -[SOAPParser:0x7f84bad89660 parser:didStartElement:namespaceURI:qualifiedName:attributes:] Type not found in EWSItemType for ExchangePersonIdGuid (t:ExchangePersonIdGuid)
Jul  7 12:21:15 calvisitor-10-105-162-178 imagent[355]: <IMMacNotificationCenterManager: 0x7fdcc9d16380>:    NC Disabled: NO
Jul  7 12:23:11 calvisitor-10-105-162-178 kernel[0]: in6_unlink_ifa: IPv6 address 0x77c911453a6dbcdb has no prefix
Jul  7 12:23:12 authorMacBook-Pro kernel[0]: ARPT: 770518.944345: framerdy 0x0 bmccmd 3 framecnt 1024
Jul  7 12:24:25 authorMacBook-Pro corecaptured[38064]: Received Capture Event
Jul  7 12:24:29 authorMacBook-Pro corecaptured[38064]: CCFile::copyFile fileName is [2017-07-07_12,24,25.108710]-io80211Family-007.pcapng, source path:/var/log/CoreCapture/com.apple.iokit.IO80211Family/IO80211AWDLPeerManager//[2017-07-07_12,24,25.108710]-io80211Family-007.pcapng, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.iokit.IO80211Family/[2017-07-07_12,24,29.298901]=AuthFail:sts:5_rsn:0/IO80211AWDLPeerManager//[2017-07-07_12,24,25.108710]-io80211Family-007.pcapng
Jul  7 12:24:31 authorMacBook-Pro kernel[0]: ARPT: 770597.394609: AQM agg params 0xfc0 maxlen hi/lo 0x0 0xffff minlen 0x0 adjlen 0x0
Jul  7 12:24:31 authorMacBook-Pro corecaptured[38064]: CCFile::captureLog
Jul  7 12:24:31 authorMacBook-Pro corecaptured[38064]: CCFile::captureLogRun Skipping current file Dir file [2017-07-07_12,24,31.376032]-AirPortBrcm4360_Logs-011.txt, Current File [2017-07-07_12,24,31.376032]-AirPortBrcm4360_Logs-011.txt
Jul  7 12:24:31 authorMacBook-Pro corecaptured[38064]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  7 12:24:31 authorMacBook-Pro corecaptured[38064]: CCFile::captureLog
Jul  7 12:30:08 authorMacBook-Pro kernel[0]: ARPT: 770602.528852: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  7 12:30:08 authorMacBook-Pro kernel[0]: TBT W (2): 0x0040 [x]
Jul  7 12:30:09 authorMacBook-Pro kernel[0]: ARPT: 770605.092581: ARPT: Wake Reason: Wake on Scan offload
Jul  7 12:30:14 calvisitor-10-105-162-178 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  7 12:30:26 calvisitor-10-105-162-178 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  7 12:30:29 calvisitor-10-105-162-178 kernel[0]: IO80211AWDLPeerManager::setAwdlAutoMode Resuming AWDL
Jul  7 13:38:22 authorMacBook-Pro corecaptured[38124]: CCIOReporterFormatter::addRegistryChildToChannelDictionary streams 7
Jul  7 13:38:22 authorMacBook-Pro corecaptured[38124]: doSaveChannels@286: Will write to: /Library/Logs/CrashReporter/CoreCapture/IOReporters/[2017-07-07_13,38,22.072050] - AssocFail:sts:2_rsn:0.xml
Jul  7 13:38:23 authorMacBook-Pro corecaptured[38124]: CCFile::captureLogRun Skipping current file Dir file [2017-07-07_13,38,23.338868]-AirPortBrcm4360_Logs-013.txt, Current File [2017-07-07_13,38,23.338868]-AirPortBrcm4360_Logs-013.txt
Jul  7 13:38:23 authorMacBook-Pro corecaptured[38124]: CCIOReporterFormatter::addRegistryChildToChannel
Jul  7 16:05:38 authorMacBook-Pro kernel[0]: en0: BSSID changed to 0c:68:03:d6:c5:1c
Jul  7 16:05:42 calvisitor-10-105-161-77 kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  7 16:24:10 authorMacBook-Pro locationd[82]: PBRequester failed with Error Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline." UserInfo={NSUnderlyingError=0x7fb7f0035dc0 {Error Domain=kCFErrorDomainCFNetwork Code=-1009 "The Internet connection appears to be offline." UserInfo={NSErrorFailingURLStringKey=https://gs-loc.apple.com/clls/wloc, NSErrorFailingURLKey=https://gs-loc.apple.com/clls/wloc, _kCFStreamErrorCodeKey=8, _kCFStreamErrorDomainKey=12, NSLocalizedDescription=The Internet connection appears to be offline.}}, NSErrorFailingURLStringKey=https://gs-loc.apple.com/clls/wloc, NSErrorFailingURLKey=https://gs-loc.apple.com/clls/wloc, _kCFStreamErrorDomainKey=12, _kCFStreamErrorCodeKey=8, NSLocalizedDescription=The Internet connection appears to be offline.}
Jul  7 16:24:11 authorMacBook-Pro corecaptured[38241]: CCFile::copyFile fileName is [2017-07-07_16,24,11.442212]-AirPortBrcm4360_Logs-001.txt, source path:/var/log/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/DriverLogs//[2017-07-07_16,24,11.442212]-AirPortBrcm4360_Logs-001.txt, dest path:/Library/Logs/CrashReporter/CoreCapture/com.apple.driver.AirPort.Brcm4360.0/[2017-07-07_16,24,11.124183]=AssocFail:sts:2_rsn:0/DriverLogs//[2017-07-07_16,24,11.442212]-AirPortBrcm4360_Logs-001.txt
Jul  7 16:24:11 authorMacBook-Pro corecaptured[38241]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  7 16:24:16 authorMacBook-Pro corecaptured[38241]: CCFile::captureLog Received Capture notice id: 1499469856.145137, reason = AssocFail:sts:2_rsn:0
Jul  7 16:24:16 authorMacBook-Pro corecaptured[38241]: CCIOReporterFormatter::refreshSubscriptionsFromStreamRegistry clearing out any previous subscriptions
Jul  7 16:24:18 authorMacBook-Pro corecaptured[38241]: Received Capture Event
Jul  7 16:24:23 authorMacBook-Pro networkd[195]: -[NETClientConnection effectiveBundleID] using process name apsd as bundle ID (this is expected for daemons without bundle ID
Jul  7 16:24:43 authorMacBook-Pro QQ[10018]: ############################## _getSysMsgList
Jul  7 16:24:49 authorMacBook-Pro com.apple.AddressBook.InternetAccountsBridge[38247]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  7 16:45:57 authorMacBook-Pro WindowServer[184]: CGXDisplayDidWakeNotification [771797848593539]: posting kCGSDisplayDidWake
Jul  7 16:46:23 calvisitor-10-105-160-85 com.apple.AddressBook.InternetAccountsBridge[38259]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 3
Jul  7 16:49:57 calvisitor-10-105-160-85 locationd[82]: Location icon should now be in state 'Inactive'
Jul  7 16:53:53 calvisitor-10-105-160-85 com.apple.SecurityServer[80]: Session 102106 destroyed
Jul  7 16:57:09 calvisitor-10-105-160-85 com.apple.WebKit.WebContent[32778]: [16:57:09.235] <<<< Boss >>>> figPlaybackBossPrerollCompleted: unexpected preroll-complete notification
Jul  7 16:59:44 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  7 17:15:46 calvisitor-10-105-160-85 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.38405): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SearchHelper.xpc/Contents/MacOS/com.apple.Safari.SearchHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  7 17:20:30 calvisitor-10-105-160-85 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 17:30:00 calvisitor-10-105-160-85 kernel[0]: Sandbox: QuickLookSatelli(38418) deny(1) mach-lookup com.apple.networkd
Jul  7 17:30:00 calvisitor-10-105-160-85 QuickLookSatellite[38418]: nw_path_evaluator_start_helper_connection net_helper_path_evaluation_start failed, dumping backtrace: [x86_64] libnetcore-583.50.1 0   libsystem_network.dylib             0x00007fff92fabde9 __nw_create_backtrace_string + 123 1   libsystem_network.dylib             0x00007fff92fc289f nw_path_evaluator_start_helper_connection + 196 2   libdispatch.dylib                   0x00007fff980fa93d _dispatch_call_block_and_release + 12 3   libdispatch.dylib                   0x00007fff980ef40b _dispatch_client_callout + 8 4   libdispatch.dylib                   0x00007fff980f403b _dispatch_queue_drain + 754 5   libdispatch.dylib                   0x00007fff980fa707 _dispatch_queue_invoke + 549 6   libdispatch.dylib                   0x00007fff980f2d53 _dispatch_root_queue_drain + 538 7   libdispatch.dylib                   0x00007fff980f2b00 _dispatch_worker_thread3 + 91 8   libsystem_pthread.dylib             0x00007fff8ebc44de _pthread_wqthread + 1129 9   libsystem_pthread.dylib             0x00007fff8ebc2341 start_wqthread + 13
Jul  7 17:34:51 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  7 17:45:26 calvisitor-10-105-160-85 loginwindow[94]: CoreAnimation: warning, deleted thread with uncommitted CATransaction; set CA_DEBUG_TRANSACTIONS=1 in environment to log backtraces.
Jul  7 18:02:24 calvisitor-10-105-160-85 kernel[0]: RTC: PowerByCalendarDate setting ignored
Jul  7 18:02:24 calvisitor-10-105-160-85 kernel[0]: IOThunderboltSwitch<0>(0x0)::listenerCallback - Thunderbolt HPD packet for route = 0x0 port = 12 unplug = 0
Jul  7 18:02:49 calvisitor-10-105-160-85 kernel[0]: Sandbox: com.apple.Addres(38449) deny(1) network-outbound /private/var/run/mDNSResponder
Jul  7 18:09:40 calvisitor-10-105-160-85 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 18:09:40 calvisitor-10-105-160-85 kernel[0]: en0: channel changed to 1
Jul  7 18:09:40 authorMacBook-Pro kernel[0]: [HID] [ATC] AppleDeviceManagementHIDEventService::processWakeReason Wake reason: Host (0x01)
Jul  7 18:09:41 authorMacBook-Pro cdpd[11807]: Saw change in network reachability (isReachable=0)
Jul  7 18:09:46 authorMacBook-Pro corecaptured[38453]: CCFile::captureLogRun() Exiting CCFile::captureLogRun
Jul  7 18:10:00 calvisitor-10-105-160-85 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 40 seconds.  Ignoring.
Jul  7 18:10:10 calvisitor-10-105-160-85 kernel[0]: IO80211AWDLPeerManager::setAwdlOperatingMode Setting the AWDL operation mode from AUTO to SUSPENDED
Jul  7 18:10:14 calvisitor-10-105-160-85 kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  7 18:11:11 calvisitor-10-105-160-85 kernel[0]: Previous sleep cause: 5
Jul  7 18:11:20 calvisitor-10-105-160-85 com.apple.cts[258]: com.apple.EscrowSecurityAlert.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 68031 seconds.  Ignoring.
Jul  7 18:11:21 calvisitor-10-105-160-85 com.apple.cts[258]: com.apple.Safari.SafeBrowsing.Update: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 2889 seconds.  Ignoring.
Jul  7 18:11:40 calvisitor-10-105-160-85 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  7 18:23:30 calvisitor-10-105-160-85 kernel[0]: AppleThunderboltGenericHAL::earlyWake - complete - took 0 milliseconds
Jul  7 18:23:32 calvisitor-10-105-160-85 kernel[0]: IO80211AWDLPeerManager::setAwdlSuspendedMode() Suspending AWDL, enterQuietMode(true)
Jul  7 18:23:40 calvisitor-10-105-160-85 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 67203 seconds.  Ignoring.
Jul  7 18:24:25 calvisitor-10-105-160-85 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 442301 seconds.  Ignoring.
Jul  7 18:37:36 calvisitor-10-105-160-85 AddressBookSourceSync[38490]: -[SOAPParser:0x7fca6040cb50 parser:didStartElement:namespaceURI:qualifiedName:attributes:] Type not found in EWSItemType for ExchangePersonIdGuid (t:ExchangePersonIdGuid)
Jul  7 18:38:03 calvisitor-10-105-160-85 com.apple.cts[258]: com.apple.icloud.fmfd.heartbeat: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 441483 seconds.  Ignoring.
Jul  7 18:50:45 calvisitor-10-105-160-85 kernel[0]: ARPT: 775899.188954: wl0: wl_update_tcpkeep_seq: Updated seq/ack/win from UserClient Seq 2863091569, Ack 159598625, Win size 278
Jul  7 18:50:46 calvisitor-10-105-160-85 sharingd[30299]: 18:50:46.109 : BTLE scanner Powered On
Jul  7 18:50:46 calvisitor-10-105-160-85 com.apple.cts[43]: com.apple.SoftwareUpdate.Activity: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 4223 seconds.  Ignoring.
Jul  7 18:51:05 calvisitor-10-105-160-85 com.apple.cts[43]: com.apple.CacheDelete.daily: scheduler_evaluate_activity told me to run this job; however, but the start time isn't for 65558 seconds.  Ignoring.
Jul  7 19:04:23 calvisitor-10-105-160-85 kernel[0]: AppleCamIn::systemWakeCall - messageType = 0xE0000340
Jul  7 19:04:45 calvisitor-10-105-160-85 com.apple.AddressBook.InternetAccountsBridge[38507]: dnssd_clientstub ConnectToServer: connect()-> No of tries: 1
Jul  7 19:07:53 authorMacBook-Pro kernel[0]: AppleCamIn::handleWakeEvent_gated
Jul  7 19:21:28 calvisitor-10-105-160-85 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 02:21:28 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  7 19:43:07 calvisitor-10-105-160-85 kernel[0]: full wake promotion (reason 1) 374 ms
Jul  7 19:43:09 calvisitor-10-105-160-85 CalendarAgent[279]: [com.apple.calendar.store.log.caldav.coredav] [Refusing to parse response to PROPPATCH because of content-type: [text/html; charset=UTF-8].]
Jul  7 20:08:13 calvisitor-10-105-160-85 secd[276]:  securityd_xpc_dictionary_handler cloudd[326] copy_matching Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  7 20:32:00 calvisitor-10-105-160-85 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9951217bb0>.
Jul  7 20:32:00 calvisitor-10-105-160-85 quicklookd[38603]: Error returned from iconservicesagent: (null)
Jul  7 20:32:02 calvisitor-10-105-160-85 secd[276]:  securityd_xpc_dictionary_handler cloudd[326] copy_matching Error Domain=NSOSStatusErrorDomain Code=-50 "query missing class name" (paramErr: error in user parameter list) UserInfo={NSDescription=query missing class name}
Jul  7 20:32:12 calvisitor-10-105-160-85 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9950712080>.
Jul  7 20:32:28 calvisitor-10-105-160-85 iconservicesagent[328]: -[ISGenerateImageOp generateImageWithCompletion:] Failed to composit image for descriptor <ISBindingImageDescriptor: 0x7f9951214ca0>.
Jul  7 20:34:14 calvisitor-10-105-160-85 locationd[82]: NETWORK: requery, 0, 0, 0, 0, 328, items, fQueryRetries, 0, fLastRetryTimestamp, 521177334.4
Jul  7 20:39:28 calvisitor-10-105-160-85 com.apple.WebKit.Networking[9854]: NSURLSession/NSURLConnection HTTP load failed (kCFStreamErrorDomainSSL, -9806)
Jul  7 20:43:37 calvisitor-10-105-160-85 QuickLookSatellite[38624]: [QL] No sandbox token for request <QLThumbnailRequest vmware-usbarb-25037.log>, it will probably fail
Jul  7 20:44:13 calvisitor-10-105-160-85 GPUToolsAgent[38749]: schedule invalidation <DYTransport 0x7f89e8c00520, error: lost transport connection (31)>
Jul  7 20:50:32 calvisitor-10-105-160-85 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 20:51:27 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  7 20:52:49 calvisitor-10-105-160-85 com.apple.CDScheduler[258]: Thermal pressure state: 0 Memory pressure state: 0
Jul  7 20:57:37 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: status: off
Jul  7 21:01:22 calvisitor-10-105-160-85 quicklookd[38603]: Error returned from iconservicesagent: (null)
Jul  7 21:08:26 calvisitor-10-105-160-85 WeChat[24144]: jemmytest
Jul  7 21:12:46 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  7 21:18:04 calvisitor-10-105-160-85 com.apple.xpc.launchd[1] (com.apple.xpc.launchd.domain.pid.WebContent.38838): Path not allowed in target domain: type = pid, path = /System/Library/StagedFrameworks/Safari/SafariShared.framework/Versions/A/XPCServices/com.apple.Safari.SocialHelper.xpc/Contents/MacOS/com.apple.Safari.SocialHelper error = 147: The specified service did not ship in the requestor's bundle, origin = /System/Library/StagedFrameworks/Safari/WebKit.framework/Versions/A/XPCServices/com.apple.WebKit.WebContent.xpc
Jul  7 21:22:43 calvisitor-10-105-160-85 com.apple.WebKit.WebContent[38826]: [21:22:43.147] mv_LowLevelCheckIfVideoPlayableUsingDecoder signalled err=-12956 (kFigMediaValidatorError_VideoCodecNotSupported) (video codec 1) at  line 1921
Jul  7 21:23:10 calvisitor-10-105-160-85 com.apple.WebKit.WebContent[38826]: <<<< MediaValidator >>>> mv_LookupCodecSupport: Unrecognized codec 1
Jul  7 21:23:11 calvisitor-10-105-160-85 com.apple.WebKit.WebContent[38826]: <<<< MediaValidator >>>> mv_ValidateRFC4281CodecId: Unrecognized codec 1.(null). Failed codec specific check.
Jul  7 21:24:19 calvisitor-10-105-160-85 WindowServer[184]: CoreAnimation: timed out fence 5fe83
Jul  7 21:26:38 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  7 21:29:30 calvisitor-10-105-160-85 Safari[9852]: tcp_connection_tls_session_error_callback_imp 2515 __tcp_connection_tls_session_callback_write_block_invoke.434 error 22
Jul  7 21:30:12 calvisitor-10-105-160-85 Safari[9852]: KeychainGetICDPStatus: keychain: -25300
Jul  7 21:31:11 calvisitor-10-105-160-85 garcon[38866]: Failed to connect (view) outlet from (NSApplication) to (NSColorPickerGridView): missing setter or instance variable
Jul  7 21:37:56 calvisitor-10-105-160-85 locationd[82]: Location icon should now be in state 'Inactive'
Jul  7 21:47:20 calvisitor-10-105-160-85 QQ[10018]: 2017/07/07 21:47:20.392 | I | VoipWrapper  | DAVEngineImpl.cpp:1400:Close             | close video chat. llFriendUIN = 515629905.
Jul  7 21:47:38 calvisitor-10-105-160-85 kernel[0]: ARPT: 783667.697957: AirPort_Brcm43xx::powerChange: System Sleep
Jul  7 21:57:08 calvisitor-10-105-160-85 kernel[0]: Bluetooth -- LE is supported - Disable LE meta event
Jul  7 21:58:03 calvisitor-10-105-160-85 WindowServer[184]: send_datagram_available_ping: pid 445 failed to act on a ping it dequeued before timing out.
Jul  7 21:58:14 calvisitor-10-105-160-85 kernel[0]: IOPMrootDomain: idle cancel, state 1
Jul  7 21:58:33 calvisitor-10-105-160-85 NeteaseMusic[17988]: 21:58:33.765 ERROR:    177: timed out after 15.000s (0 0); mMajorChangePending=0
Jul  7 21:59:08 calvisitor-10-105-160-85 kernel[0]: ARPT: 783790.553857: wl0: MDNS: IPV6 Addr: 2607:f140:6000:8:c6b3:1ff:fecd:467f
Jul  7 22:10:52 calvisitor-10-105-160-85 kernel[0]: ARPT: 783795.288172: AirPort_Brcm43xx::powerChange: System Wake - Full Wake/ Dark Wake / Maintenance wake
Jul  7 22:11:54 calvisitor-10-105-160-85 QQ[10018]: button report: 0x8002be0
Jul  7 22:24:31 calvisitor-10-105-160-85 sharingd[30299]: 22:24:31.135 : BTLE scanner Powered On
Jul  7 22:32:31 calvisitor-10-105-160-85 Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 05:32:31 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)
Jul  7 22:46:29 calvisitor-10-105-160-85 QQ[10018]: button report: 0x8002be0
Jul  7 22:47:06 calvisitor-10-105-160-85 kernel[0]: ARPT: 783991.995027: wl0: setup_keepalive: interval 900, retry_interval 30, retry_count 10
Jul  7 23:00:44 calvisitor-10-105-160-85 kernel[0]: ARPT: 784053.579480: wl0: setup_keepalive: Local port: 59927, Remote port: 443
Jul  7 23:00:46 calvisitor-10-105-160-85 kernel[0]: ARPT: 784055.560270: IOPMPowerSource Information: onSleep,  SleepType: Normal Sleep,  'ExternalConnected': No, 'TimeRemaining': 5600,
Jul  7 23:14:23 calvisitor-10-105-160-85 kernel[0]: ARPT: 784117.089800: AirPort_Brcm43xx::powerChange: System Sleep
Jul  7 23:27:02 calvisitor-10-105-160-85 kernel[0]: ARPT: 784117.625615: wl0: leaveModulePoweredForOffloads: Wi-Fi will stay on.
Jul  7 23:38:27 calvisitor-10-105-160-85 kernel[0]: ARPT: 784178.158614: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  7 23:38:32 authorMacBook-Pro kernel[0]: en0::IO80211Interface::postMessage bssid changed
Jul  8 00:30:39 authorMacBook-Pro kernel[0]: in6_unlink_ifa: IPv6 address 0x77c911454f1523ab has no prefix
Jul  8 00:30:47 authorMacBook-Pro networkd[195]: -[NETClientConnection evaluateCrazyIvan46] CI46 - Perform CrazyIvan46! QQ.10018 tc25805 123.151.137.106:80
Jul  8 00:30:48 calvisitor-10-105-160-47 symptomsd[215]: __73-[NetworkAnalyticsEngine observeValueForKeyPath:ofObject:change:context:]_block_invoke unexpected switch value 2
Jul  8 00:44:20 calvisitor-10-105-160-47 kernel[0]: ARPT: 784287.966851: AirPort_Brcm43xx::platformWoWEnable: WWEN[enable]
Jul  8 00:45:21 calvisitor-10-105-160-47 kernel[0]: AppleThunderboltNHIType2::waitForOk2Go2Sx - intel_rp = 1 dlla_reporting_supported = 0
Jul  8 00:47:42 calvisitor-10-105-160-47 kernel[0]: USBMSC Identifier (non-unique): 000000000820 0x5ac 0x8406 0x820, 3
Jul  8 00:58:14 calvisitor-10-105-160-47 kernel[0]: efi pagecount 72
Jul  8 07:27:36 calvisitor-10-105-162-124 kernel[0]: ARPT: 790457.609414: AirPort_Brcm43xx::powerChange: System Sleep
Jul  8 07:29:50 authorMacBook-Pro Dock[307]: -[UABestAppSuggestionManager notifyBestAppChanged:type:options:bundleIdentifier:activityType:dynamicIdentifier:when:confidence:deviceName:deviceIdentifier:deviceType:] (null) UASuggestedActionType=0 (null)/(null) opts=(null) when=2017-07-08 14:29:50 +0000 confidence=1 from=(null)/(null) (UABestAppSuggestionManager.m #319)`.split(
    '\n'
  );
