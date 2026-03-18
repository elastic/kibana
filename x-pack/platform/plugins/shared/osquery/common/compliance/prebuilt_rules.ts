/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComplianceRuleMetadata } from './types';

const rule = (
  ruleId: string,
  name: string,
  query: string,
  remediation: string,
  benchmarkId: string,
  benchmarkName: string,
  benchmarkVersion: string,
  ruleNumber: string,
  section: string,
  platform: 'darwin' | 'windows' | 'linux',
  resourceType: string,
  nistControls: string[]
): ComplianceRuleMetadata => ({
  rule_id: ruleId,
  name,
  description: name,
  query,
  remediation,
  benchmark: {
    id: benchmarkId,
    name: benchmarkName,
    version: benchmarkVersion,
    posture_type: 'endpoint',
  },
  rule_number: ruleNumber,
  section,
  level: 1,
  platform,
  frameworks: nistControls.map((c) => ({ id: 'nist_800_53', version: 'r5', control: c })),
  tags: [benchmarkId, platform, section, 'CIS_Level1'],
  enabled: true,
  interval: 300,
  prebuilt: true,
  resource_type: resourceType,
});

export const PREBUILT_COMPLIANCE_RULES: ComplianceRuleMetadata[] = [
  // ── macOS 15 ──────────────────────────────────────────────────────────────────

  rule(
    'cis_macos_15_2_1_1',
    'Ensure FileVault Is Enabled',
    `SELECT 1 FROM disk_encryption WHERE encrypted = 1 AND user_uuid IS NOT '' LIMIT 1;`,
    'Enable FileVault via System Settings > Privacy & Security > FileVault.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '2.1.1',
    '2 Storage',
    'darwin',
    'encryption',
    ['CM-6(a)', 'SC-28']
  ),

  rule(
    'cis_macos_15_2_2_1',
    'Ensure Firewall Is Enabled',
    'SELECT 1 FROM alf WHERE global_state >= 1;',
    'Enable firewall via System Settings > Network > Firewall.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '2.2.1',
    '2 Network',
    'darwin',
    'firewall',
    ['SC-7(5)', 'CM-7']
  ),

  rule(
    'cis_macos_15_1_1',
    'Ensure All Apple-Provided Software Is Current',
    `SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM software_update WHERE restart_required = 'YES');`,
    'Apply all updates via System Settings > General > Software Update.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '1.1',
    '1 Updates',
    'darwin',
    'patching',
    ['SI-2', 'CM-6(a)']
  ),

  rule(
    'cis_macos_15_5_8',
    'Ensure Screen Saver Timeout Is 5 Minutes or Less',
    `SELECT 1 FROM managed_policies WHERE domain = 'com.apple.screensaver' AND name = 'idleTime' AND CAST(value AS INTEGER) <= 300;`,
    'Set screen saver timeout to 5 minutes or less via MDM profile.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '5.8',
    '5 User Accounts',
    'darwin',
    'session',
    ['AC-11', 'AC-11(1)']
  ),

  rule(
    'cis_macos_15_5_2_1',
    'Ensure SSH Root Login Is Disabled',
    `SELECT 1 FROM ssh_configs WHERE key = 'PermitRootLogin' AND value = 'no';`,
    "Set PermitRootLogin to 'no' in /etc/ssh/sshd_config.",
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '5.2.1',
    '5 User Accounts',
    'darwin',
    'access_control',
    ['IA-2(5)', 'AC-6(2)']
  ),

  rule(
    'cis_macos_15_2_3_1',
    'Ensure Remote Login Is Disabled',
    'SELECT 1 FROM sharing_preferences WHERE remote_login = 0;',
    'Disable Remote Login in System Settings > General > Sharing.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '2.3.1',
    '2 Network',
    'darwin',
    'access_control',
    ['CM-7', 'AC-17']
  ),

  rule(
    'cis_macos_15_2_4_1',
    'Ensure AirDrop Is Disabled',
    `SELECT 1 FROM managed_policies WHERE domain = 'com.apple.NetworkBrowser' AND name = 'DisableAirDrop' AND value = '1';`,
    'Deploy an MDM profile that disables AirDrop.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '2.4.1',
    '2 Network',
    'darwin',
    'network',
    ['CM-7', 'AC-3']
  ),

  rule(
    'cis_macos_15_6_1_3',
    'Ensure Guest Account Is Disabled',
    `SELECT 1 FROM managed_policies WHERE domain = 'com.apple.loginwindow' AND name = 'GuestEnabled' AND value = '0';`,
    'Disable the Guest account in System Settings > Users & Groups.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '6.1.3',
    '6 User Accounts',
    'darwin',
    'account',
    ['AC-2(1)', 'CM-6(a)']
  ),

  rule(
    'cis_macos_15_2_5_1',
    'Ensure Bluetooth Is Non-Discoverable',
    `SELECT 1 FROM managed_policies WHERE domain = 'com.apple.Bluetooth' AND name = 'BluetoothDiscoverable' AND value = '0';`,
    'Configure Bluetooth to non-discoverable via MDM profile.',
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '2.5.1',
    '2 Network',
    'darwin',
    'network',
    ['CM-7', 'SC-8']
  ),

  rule(
    'cis_macos_15_5_1_1',
    'Ensure System Integrity Protection Is Enabled',
    `SELECT 1 FROM sip_config WHERE config_flag = 'sip' AND enabled = 1;`,
    "Boot into Recovery Mode and run 'csrutil enable'.",
    'cis_macos_15',
    'CIS macOS 15.0 Sequoia',
    'v1.0.0',
    '5.1.1',
    '5 Security',
    'darwin',
    'integrity',
    ['SI-7', 'CM-5']
  ),

  // ── Windows 11 ────────────────────────────────────────────────────────────────

  rule(
    'cis_win_11_18_9_11',
    'Ensure BitLocker Drive Encryption Is Enabled',
    'SELECT 1 FROM bitlocker_info WHERE protection_status = 1 LIMIT 1;',
    'Enable BitLocker via Group Policy or Settings.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '18.9.11',
    '18 Administrative',
    'windows',
    'encryption',
    ['SC-28', 'SC-28(1)']
  ),

  rule(
    'cis_win_11_9_1_1',
    'Ensure Windows Firewall Is Enabled',
    `SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM windows_firewall_rules WHERE enabled = 0 AND name LIKE '%Domain%Profile%');`,
    'Enable Windows Firewall for all profiles via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '9.1.1',
    '9 Firewall',
    'windows',
    'firewall',
    ['SC-7(5)', 'CM-7']
  ),

  rule(
    'cis_win_11_18_9_108',
    'Ensure Auto-Update Is Enabled',
    "SELECT 1 FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU\\NoAutoUpdate' AND data = '0';",
    'Configure Windows Update via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '18.9.108',
    '18 Administrative',
    'windows',
    'patching',
    ['SI-2', 'CM-6(a)']
  ),

  rule(
    'cis_win_11_18_8_1',
    'Ensure Screen Lock Timeout Is 15 Minutes or Less',
    "SELECT 1 FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\InactivityTimeoutSecs' AND CAST(data AS INTEGER) <= 900 AND CAST(data AS INTEGER) > 0;",
    'Set machine inactivity limit via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '18.8.1',
    '18 Administrative',
    'windows',
    'session',
    ['AC-11', 'AC-11(1)']
  ),

  rule(
    'cis_win_11_1_2_1',
    'Ensure Account Lockout Threshold Is 5 or Fewer',
    "SELECT 1 FROM security_policy WHERE name = 'LockoutBadCount' AND CAST(value AS INTEGER) <= 5 AND CAST(value AS INTEGER) > 0;",
    'Set account lockout threshold via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '1.2.1',
    '1 Account',
    'windows',
    'account',
    ['AC-7', 'IA-5']
  ),

  rule(
    'cis_win_11_17_1_1',
    'Ensure Audit Logon Events Is Enabled',
    "SELECT 1 FROM security_policy WHERE name = 'AuditLogonEvents' AND CAST(value AS INTEGER) >= 1;",
    'Enable audit logon events via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '17.1.1',
    '17 Audit',
    'windows',
    'audit',
    ['AU-2', 'AU-12']
  ),

  rule(
    'cis_win_11_18_9_65',
    'Ensure Remote Desktop Requires NLA',
    "SELECT 1 FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp\\UserAuthentication' AND data = '1';",
    'Require NLA for Remote Desktop via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '18.9.65',
    '18 Administrative',
    'windows',
    'access_control',
    ['AC-17(2)', 'IA-2']
  ),

  rule(
    'cis_win_11_2_3_17',
    'Ensure UAC Is Enabled',
    "SELECT 1 FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\EnableLUA' AND data = '1';",
    'Ensure UAC is enabled via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '2.3.17',
    '2 Local Policies',
    'windows',
    'privilege',
    ['AC-6', 'CM-6(a)']
  ),

  rule(
    'cis_win_11_18_9_47',
    'Ensure Windows Defender Real-Time Protection Is Enabled',
    "SELECT 1 FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection\\DisableRealtimeMonitoring' AND data = '0';",
    'Enable real-time protection via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '18.9.47',
    '18 Administrative',
    'windows',
    'antivirus',
    ['SI-3', 'SC-44']
  ),

  rule(
    'cis_win_11_1_1_5',
    'Ensure Minimum Password Length Is 14 or More',
    "SELECT 1 FROM security_policy WHERE name = 'MinimumPasswordLength' AND CAST(value AS INTEGER) >= 14;",
    'Set minimum password length via Group Policy.',
    'cis_win_11',
    'CIS Windows 11 Enterprise',
    'v1.0.0',
    '1.1.5',
    '1 Account',
    'windows',
    'password_policy',
    ['IA-5(1)', 'CM-6(a)']
  ),

  // ── Linux ─────────────────────────────────────────────────────────────────────

  rule(
    'cis_linux_6_1_1',
    'Ensure Permissions on /etc/passwd Are Configured',
    "SELECT 1 FROM file WHERE path = '/etc/passwd' AND mode = '0644';",
    'Run: chmod 644 /etc/passwd',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '6.1.1',
    '6 System Maintenance',
    'linux',
    'file_permissions',
    ['AC-3(3)', 'CM-6(a)']
  ),

  rule(
    'cis_linux_5_2_4',
    'Ensure SSH Protocol Is Version 2',
    "SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM ssh_configs WHERE key = 'Protocol' AND value != '2');",
    'Set Protocol 2 in /etc/ssh/sshd_config.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '5.2.4',
    '5 Access',
    'linux',
    'access_control',
    ['AC-17(2)', 'SC-8']
  ),

  rule(
    'cis_linux_3_5_1',
    'Ensure Firewall Is Active',
    "SELECT 1 FROM iptables WHERE chain = 'INPUT' LIMIT 1;",
    'Enable and configure iptables/nftables/firewalld.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '3.5.1',
    '3 Network',
    'linux',
    'firewall',
    ['SC-7(5)', 'CM-7']
  ),

  rule(
    'cis_linux_5_4_1',
    'Ensure Password Max Age Is 365 Days or Less',
    "SELECT 1 FROM shadow WHERE username = 'root' AND CAST(max AS INTEGER) <= 365 AND CAST(max AS INTEGER) > 0;",
    'Set PASS_MAX_DAYS to 365 or less in /etc/login.defs.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '5.4.1',
    '5 Access',
    'linux',
    'password_policy',
    ['IA-5(1)', 'CM-6(a)']
  ),

  rule(
    'cis_linux_4_1_2',
    'Ensure Audit Daemon Is Running',
    "SELECT 1 FROM processes WHERE name = 'auditd';",
    'Start and enable auditd: systemctl enable --now auditd',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '4.1.2',
    '4 Audit',
    'linux',
    'audit',
    ['AU-2', 'AU-12']
  ),

  rule(
    'cis_linux_5_1_2',
    'Ensure Cron Directory Permissions Are Restricted',
    "SELECT 1 FROM file WHERE path = '/etc/crontab' AND mode = '0600';",
    'Run: chmod 600 /etc/crontab',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '5.1.2',
    '5 Access',
    'linux',
    'file_permissions',
    ['AC-3(3)', 'CM-6(a)']
  ),

  rule(
    'cis_linux_6_1_13',
    'Ensure No World-Writable SUID Files',
    "SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM suid_bin WHERE permissions LIKE '%w%');",
    'Remove world-writable permissions from SUID binaries.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '6.1.13',
    '6 System Maintenance',
    'linux',
    'file_permissions',
    ['AC-6(1)', 'CM-6(a)']
  ),

  rule(
    'cis_linux_3_1_1',
    'Ensure IP Forwarding Is Disabled',
    "SELECT 1 FROM system_controls WHERE name = 'net.ipv4.ip_forward' AND current_value = '0';",
    'Set net.ipv4.ip_forward = 0 in /etc/sysctl.conf.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '3.1.1',
    '3 Network',
    'linux',
    'network',
    ['CM-7', 'SC-7']
  ),

  rule(
    'cis_linux_5_2_10',
    'Ensure SSH Root Login Is Disabled',
    "SELECT 1 FROM ssh_configs WHERE key = 'PermitRootLogin' AND value = 'no';",
    "Set PermitRootLogin to 'no' in /etc/ssh/sshd_config.",
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '5.2.10',
    '5 Access',
    'linux',
    'access_control',
    ['IA-2(5)', 'AC-6(2)']
  ),

  rule(
    'cis_linux_1_1_2',
    'Ensure /tmp Is Mounted with noexec',
    "SELECT 1 FROM mounts WHERE path = '/tmp' AND flags LIKE '%noexec%';",
    'Add noexec option to /tmp mount in /etc/fstab.',
    'cis_linux',
    'CIS Linux (RHEL 9 / Ubuntu 22.04)',
    'v1.0.0',
    '1.1.2',
    '1 Filesystem',
    'linux',
    'filesystem',
    ['AC-6(10)', 'CM-6(a)']
  ),
];
