/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/convert_saved_search_rules.js
// Do not hand edit. Run the script against a set of saved searches instead

import rule1 from './windows_net_user_command_activity.json';
import rule2 from './windows_image_load_from_a_temp_directory.json';
import rule3 from './slow_logs_filebeat_redis_ecs.json';
import rule4 from './ossec_rootkits_filebeat_osquery_ecs.json';
import rule5 from './linux_strace_activity.json';
import rule6 from './events_filebeat_suricata_ecs.json';
import rule7 from './all_asa_logs_filebeat_cisco.json';
import rule8 from './windows_net_command_activity_by_the_system_account.json';
import rule9 from './alerts_filebeat_suricata_ecs.json';
import rule10 from './linux_java_process_connecting_to_the_internet.json';
import rule11 from './linux_netcat_network_connection.json';
import rule12 from './panos_flows_filebeat_panw_ecs.json';
import rule13 from './command_shell_started_by_internet_explorer.json';
import rule14 from './windows_nmap_activity.json';
import rule15 from './suspicious_process_started_by_a_script.json';
import rule16 from './deb_packages_installed_filebeat_osquery_ecs.json';
import rule17 from './powershell_network_connection.json';
import rule18 from './linux_kernel_module_activity.json';
import rule19 from './panos_threats_filebeat_panw_ecs.json';
import rule20 from './command_shell_started_by_svchost.json';
import rule21 from './linux_tcpdump_activity.json';
import rule22 from './process_started_by_ms_office_program_possible_payload.json';
import rule23 from './audit_events_filebeat_auditd_ecs.json';
import rule24 from './process_started_by_acrobat_reader_possible_payload.json';
import rule25 from './linux_ptrace_activity.json';
import rule26 from './windows_wireshark_activity.json';
import rule27 from './error_logs_filebeat_aws.json';
import rule28 from './ssh_login_attempts_filebeat_system_ecs.json';
import rule29 from './santa_logs_search_filebeat_santa_ecs.json';
import rule30 from './nginx_access_logs_filebeat_nginx_ecs.json';
import rule31 from './windows_whoami_command_activity.json';
import rule32 from './windump_activity.json';
import rule33 from './startup_errors_filebeat_icinga_ecs.json';
import rule34 from './logs_filebeat_redis_ecs.json';
import rule35 from './slow_logs_filebeat_logstash_ecs.json';
import rule36 from './asa_firewall_flows_filebeat_cisco.json';
import rule37 from './ubiquiti_firewall_allowed_events_filebeat_iptables_ecs.json';
import rule38 from './psexec_activity.json';
import rule39 from './mounts_filebeat_osquery_ecs.json';
import rule40 from './linux_rawshark_activity.json';
import rule41 from './useradd_logs_filebeat_system_ecs.json';
import rule42 from './errorlogs_filebeat_ibm_mq.json';
import rule43 from './linux_whoami_commmand.json';
import rule44 from './linux_lzop_activity_possible_julianrunnels.json';
import rule45 from './asa_firewall_events_filebeat_cisco.json';
import rule46 from './windows_burp_ce_activity.json';
import rule47 from './linux_hping_activity.json';
import rule48 from './nginx_error_logs_filebeat_nginx_ecs.json';
import rule49 from './ubiquiti_firewall_blocked_events_filebeat_iptables_ecs.json';
import rule50 from './all_logs_filebeat_kafka_ecs.json';
import rule51 from './apache_access_logs_filebeat_apache_ecs.json';
import rule52 from './apache_errors_log_filebeat_apache_ecs.json';
import rule53 from './slow_logs_filebeat_mysql_ecs.json';
import rule54 from './error_logs_filebeat_mysql_ecs.json';
import rule55 from './nginx_logs_filebeat_nginx_ecs.json';
import rule56 from './traefik_logs_filebeat_traefik_ecs.json';
import rule57 from './stacktraces_filebeat_kafka_ecs.json';
import rule58 from './all_logs_filebeat_postgresql_ecs.json';
import rule59 from './query_durations_filebeat_postgresql_ecs.json';
import rule60 from './slow_queries_filebeat_postgresql_ecs.json';
import rule61 from './syslog_logs_filebeat_system_ecs.json';
import rule62 from './windows_netcat_network_activity.json';
import rule63 from './windows_iodine_activity.json';
import rule64 from './flow_records_filebeat_netflow.json';
import rule65 from './linux_process_started_in_temp_directory.json';
import rule66 from './linux_web_download.json';
import rule67 from './events_search_filebeat_iptables_ecs.json';
import rule68 from './windows_process_started_by_the_java_runtime.json';
import rule69 from './os_versions_filebeat_osquery_ecs.json';
import rule70 from './sudo_commands_filebeat_system_ecs.json';
import rule71 from './all_logs_filebeat_mongodb_ecs.json';
import rule72 from './network_flow_search_filebeat.json';
import rule73 from './command_shell_started_by_powershell.json';
import rule74 from './linux_nmap_activity.json';
import rule75 from './ubiquiti_firewall_events_filebeat_iptables_ecs.json';
import rule76 from './search_windows_10.json';
import rule77 from './debug_log_filebeat_icinga_ecs.json';
import rule78 from './logs_filebeat_logstash_ecs.json';
import rule79 from './host_stats_filebeat_suricata_ecs.json';
import rule80 from './linux_unusual_shell_activity.json';
import rule81 from './linux_mknod_activity.json';
import rule82 from './linux_iodine_activity.json';
import rule83 from './windows_netcat_activity.json';
import rule84 from './linux_nping_activity.json';
import rule85 from './process_started_by_windows_defender.json';
import rule86 from './error_logs_filebeat_mongodb_ecs.json';
import rule87 from './groupadd_logs_filebeat_system_ecs.json';
import rule88 from './kernel_modules_filebeat_osquery_ecs.json';
import rule89 from './linux_shell_activity_by_web_server.json';
import rule90 from './linux_ld.json';
import rule91 from './windows_mimikatz_activity.json';
import rule92 from './main_log_filebeat_icinga_ecs.json';
import rule93 from './windows_nmap_scan_activity.json';

export const rawRules = [
  rule1,
  rule2,
  rule3,
  rule4,
  rule5,
  rule6,
  rule7,
  rule8,
  rule9,
  rule10,
  rule11,
  rule12,
  rule13,
  rule14,
  rule15,
  rule16,
  rule17,
  rule18,
  rule19,
  rule20,
  rule21,
  rule22,
  rule23,
  rule24,
  rule25,
  rule26,
  rule27,
  rule28,
  rule29,
  rule30,
  rule31,
  rule32,
  rule33,
  rule34,
  rule35,
  rule36,
  rule37,
  rule38,
  rule39,
  rule40,
  rule41,
  rule42,
  rule43,
  rule44,
  rule45,
  rule46,
  rule47,
  rule48,
  rule49,
  rule50,
  rule51,
  rule52,
  rule53,
  rule54,
  rule55,
  rule56,
  rule57,
  rule58,
  rule59,
  rule60,
  rule61,
  rule62,
  rule63,
  rule64,
  rule65,
  rule66,
  rule67,
  rule68,
  rule69,
  rule70,
  rule71,
  rule72,
  rule73,
  rule74,
  rule75,
  rule76,
  rule77,
  rule78,
  rule79,
  rule80,
  rule81,
  rule82,
  rule83,
  rule84,
  rule85,
  rule86,
  rule87,
  rule88,
  rule89,
  rule90,
  rule91,
  rule92,
  rule93,
];
