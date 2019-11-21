/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../graphql/types';

export const mockEndgameDnsRequest: Ecs = {
  _id: 'S8jPcG0BOpWiDweSou3g',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['request_event'],
    category: ['network'],
    kind: ['event'],
  },
  message: [
    'DNS query is completed for the name %1, type %2, query options %3 with status %4 Results %5 ',
  ],
  timestamp: '1569555712000',
  dns: {
    question: {
      name: ['update.googleapis.com'],
      type: ['A'],
    },
    resolved_ip: ['10.100.197.67'],
  },
  network: {
    protocol: ['dns'],
  },
  process: {
    pid: [443192],
    name: ['GoogleUpdate.exe'],
    executable: ['C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe'],
  },
  winlog: {
    event_id: [3008],
  },
  endgame: {
    process_name: ['GoogleUpdate.exe'],
    pid: [443192],
  },
};

export const mockEndgameFileCreateEvent: Ecs = {
  _id: '98jPcG0BOpWiDweSouzg',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['file_create_event'],
    category: ['file'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  endgame: {
    process_name: ['chrome.exe'],
    pid: [11620],
    file_path: [
      'C:\\Users\\Arun\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\63d78c21-e593-4484-b7a9-db33cd522ddc.tmp',
    ],
  },
};

export const mockEndgameFileDeleteEvent: Ecs = {
  _id: 'OMjPcG0BOpWiDweSeuW9',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['10.0'],
    },
    ip: ['10.134.159.150'],
    name: ['HD-v1s-d2118419'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['file_delete_event'],
    category: ['file'],
    kind: ['event'],
  },
  timestamp: '1569555704000',
  endgame: {
    pid: [1084],
    file_name: ['tmp000002f6'],
    file_path: ['C:\\Windows\\TEMP\\tmp00000404\\tmp000002f6'],
    process_name: ['AmSvc.exe'],
  },
};

export const mockEndgameIpv4ConnectionAcceptEvent: Ecs = {
  _id: 'LsjPcG0BOpWiDweSCNfu',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['10.0'],
    },
    ip: ['10.43.255.177'],
    name: ['HD-gqf-0af7b4fe'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv4_connection_accept_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569555676000',
  network: {
    community_id: ['1:network-community_id'],
    transport: ['tcp'],
  },
  process: {
    pid: [1084],
    name: ['AmSvc.exe'],
    executable: ['C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe'],
  },
  source: {
    ip: ['127.0.0.1'],
    port: [49306],
  },
  destination: {
    port: [49305],
    ip: ['127.0.0.1'],
  },
  endgame: {
    pid: [1084],
  },
};

export const mockEndgameIpv6ConnectionAcceptEvent: Ecs = {
  _id: '-8SucG0BOpWiDweS0wrq',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv6_connection_accept_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569553566000',
  network: {
    community_id: ['1:network-community_id'],
    transport: ['tcp'],
  },
  process: {
    pid: [4],
  },
  source: {
    ip: ['::1'],
    port: [51324],
  },
  destination: {
    port: [5357],
    ip: ['::1'],
  },
  endgame: {
    pid: [4],
  },
};

export const mockEndgameIpv4DisconnectReceivedEvent: Ecs = {
  _id: 'hMjPcG0BOpWiDweSoOin',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv4_disconnect_received_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  network: {
    community_id: ['1:LxYHJJv98b2O0fNccXu6HheXmwk='],
    transport: ['tcp'],
    bytes: [8344],
  },
  process: {
    pid: [11620],
    name: ['chrome.exe'],
    executable: ['C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
  },
  source: {
    ip: ['192.168.0.6'],
    port: [59356],
    bytes: [2151],
  },
  destination: {
    port: [443],
    ip: ['10.156.162.53'],
    bytes: [6193],
  },
  endgame: {
    process_name: ['chrome.exe'],
  },
};

export const mockEndgameIpv6DisconnectReceivedEvent: Ecs = {
  _id: 'EcSucG0BOpWiDweS1Ayg',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv6_disconnect_received_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569553566000',
  network: {
    community_id: ['1:ZylzQhsB1dcptA2t4DY8S6l9o8E='],
    transport: ['tcp'],
    bytes: [8086],
  },
  process: {
    pid: [4],
  },
  source: {
    ip: ['::1'],
    port: [51338],
    bytes: [7837],
  },
  destination: {
    port: [2869],
    ip: ['::1'],
    bytes: [249],
  },
  endgame: {
    pid: [4],
  },
};

export const mockEndgameUserLogon: Ecs = {
  _id: 'QsjPcG0BOpWiDweSeuRE',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['10.0'],
    },
    ip: ['10.134.159.150'],
    name: ['HD-v1s-d2118419'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['user_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'An account was successfully logged on.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tWIN-Q3DOP1UKA81$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3e7\r\n\r\nLogon Type:\t\t\t5\r\n\r\nNew Logon:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tSYSTEM\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3e7\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nProcess Information:\r\n\tProcess ID:\t\t0x1b0\r\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\r\n\r\nNetwork Information:\r\n\tWorkstation Name:\t\r\n\tSource Network Address:\t-\r\n\tSource Port:\t\t-\r\n\r\nDetailed Authentication Information:\r\n\tLogon Process:\t\tAdvapi  \r\n\tAuthentication Package:\tNegotiate\r\n\tTransited Services:\t-\r\n\tPackage Name (NTLM only):\t-\r\n\tKey Length:\t\t0\r\n\r\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\r\n\r\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\r\n\r\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\r\n\r\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\r\n\r\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\r\n\r\nThe authentication information fields provide detailed information about this specific logon request.\r\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\r\n\t- Transited services indicate which intermediate services have participated in this logon request.\r\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\r\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
  ],
  timestamp: '1569555704000',
  process: {
    pid: [432],
    name: ['C:\\Windows\\System32\\services.exe'],
    executable: ['C:\\Windows\\System32\\services.exe'],
  },
  winlog: {
    event_id: [4624],
  },
  endgame: {
    target_logon_id: ['0x3e7'],
    pid: [432],
    process_name: ['C:\\Windows\\System32\\services.exe'],
    logon_type: [5],
    subject_user_name: ['WIN-Q3DOP1UKA81$'],
    subject_logon_id: ['0x3e7'],
    target_user_name: ['SYSTEM'],
    target_domain_name: ['NT AUTHORITY'],
  },
};

export const mockEndgameAdminLogon: Ecs = {
  _id: 'psjPcG0BOpWiDweSoelR',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['admin_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'Special privileges assigned to new logon.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tSYSTEM\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3E7\r\n\r\nPrivileges:\t\tSeAssignPrimaryTokenPrivilege\r\n\t\t\tSeTcbPrivilege\r\n\t\t\tSeSecurityPrivilege\r\n\t\t\tSeTakeOwnershipPrivilege\r\n\t\t\tSeLoadDriverPrivilege\r\n\t\t\tSeBackupPrivilege\r\n\t\t\tSeRestorePrivilege\r\n\t\t\tSeDebugPrivilege\r\n\t\t\tSeAuditPrivilege\r\n\t\t\tSeSystemEnvironmentPrivilege\r\n\t\t\tSeImpersonatePrivilege\r\n\t\t\tSeDelegateSessionUserImpersonatePrivilege',
  ],
  timestamp: '1569555712000',
  process: {
    pid: [964],
    executable: ['C:\\Windows\\System32\\lsass.exe'],
  },
  winlog: {
    event_id: [4672],
  },
  endgame: {
    subject_domain_name: ['NT AUTHORITY'],
    subject_user_name: ['SYSTEM'],
    pid: [964],
  },
};

export const mockEndgameExplicitUserLogon: Ecs = {
  _id: '-cSvcG0BOpWiDweSvi_s',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['explicit_user_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'A logon was attempted using explicit credentials.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tANVI-ACER$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nAccount Whose Credentials Were Used:\r\n\tAccount Name:\t\tArun\r\n\tAccount Domain:\t\tAnvi-Acer\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nTarget Server:\r\n\tTarget Server Name:\tlocalhost\r\n\tAdditional Information:\tlocalhost\r\n\r\nProcess Information:\r\n\tProcess ID:\t\t0x6c8\r\n\tProcess Name:\t\tC:\\Windows\\System32\\svchost.exe\r\n\r\nNetwork Information:\r\n\tNetwork Address:\t127.0.0.1\r\n\tPort:\t\t\t0\r\n\r\nThis event is generated when a process attempts to log on an account by explicitly specifying that account’s credentials.  This most commonly occurs in batch-type configurations such as scheduled tasks, or when using the RUNAS command.',
  ],
  timestamp: '1569553626000',
  process: {
    pid: [1736],
    name: ['C:\\Windows\\System32\\svchost.exe'],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  winlog: {
    event_id: [4648],
  },
  endgame: {
    subject_domain_name: ['WORKGROUP'],
    target_user_name: ['Arun'],
    pid: [1736],
    subject_user_name: ['ANVI-ACER$'],
    target_domain_name: ['Anvi-Acer'],
    process_name: ['C:\\Windows\\System32\\svchost.exe'],
    subject_logon_id: ['0x3e7'],
  },
};

export const mockEndgameUserLogoff: Ecs = {
  _id: 'rcSvcG0BOpWiDweSvi5K',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['user_logoff'],
    category: ['authentication'],
    kind: ['event'],
  },
  message: [
    'An account was logged off.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-21-3573271228-3407584681-1597858646-1002\r\n\tAccount Name:\t\tArun\r\n\tAccount Domain:\t\tAnvi-Acer\r\n\tLogon ID:\t\t0x16DB41E\r\n\r\nLogon Type:\t\t\t2\r\n\r\nThis event is generated when a logon session is destroyed. It may be positively correlated with a logon event using the Logon ID value. Logon IDs are only unique between reboots on the same computer.',
  ],
  timestamp: '1569553626000',
  process: {
    pid: [964],
    executable: ['C:\\Windows\\System32\\lsass.exe'],
  },
  winlog: {
    event_id: [4634],
  },
  endgame: {
    logon_type: [2],
    target_user_name: ['Arun'],
    target_logon_id: ['0x16db41e'],
    target_domain_name: ['Anvi-Acer'],
  },
};

export const mockEndgameCreationEvent: Ecs = {
  _id: 'BcjPcG0BOpWiDweSou3g',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['creation_event'],
    category: ['process'],
    type: ['process_start'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  process: {
    hash: {
      md5: ['62d06d7235b37895b68de56687895743'],
      sha1: ['12563599116157778a22600d2a163d8112aed845'],
      sha256: ['d4c97ed46046893141652e2ec0056a698f6445109949d7fcabbce331146889ee'],
    },
    pid: [441684],
    ppid: [8],
    name: ['Microsoft.Photos.exe'],
    executable: [
      'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_2018.18091.17210.0_x64__8wekyb3d8bbwe\\Microsoft.Photos.exe',
    ],
    args: [
      'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_2018.18091.17210.0_x64__8wekyb3d8bbwe\\Microsoft.Photos.exe',
      '-ServerName:App.AppXzst44mncqdg84v7sv6p7yznqwssy6f7f.mca',
    ],
  },
  endgame: {
    process_name: ['Microsoft.Photos.exe'],
    pid: [441684],
    parent_process_name: ['svchost.exe'],
  },
};

export const mockEndgameTerminationEvent: Ecs = {
  _id: '2MjPcG0BOpWiDweSoutC',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['termination_event'],
    category: ['process'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  process: {
    hash: {
      md5: ['bd4401441a21bf1abce6404f4231db4d'],
      sha1: ['797255e72d5ed5c058d4785950eba7abaa057653'],
      sha256: ['87976f3430cc99bc939e0694247c0759961a49832b87218f4313d6fc0bc3a776'],
    },
    pid: [442384],
    ppid: [8],
    name: ['RuntimeBroker.exe'],
    executable: ['C:\\Windows\\System32\\RuntimeBroker.exe'],
  },
  endgame: {
    pid: [442384],
    process_name: ['RuntimeBroker.exe'],
    exit_code: [0],
  },
};
