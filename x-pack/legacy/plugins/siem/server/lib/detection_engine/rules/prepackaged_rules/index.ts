/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/regen_prepackage_rules_index.sh
// Do not hand edit. Run that script to regenerate package information instead

import rule1 from './403_response_to_a_post.json';
import rule2 from './405_response_method_not_allowed.json';
import rule3 from './elastic_endpoint_security_adversary_behavior_detected.json';
import rule4 from './elastic_endpoint_security_cred_dumping_detected.json';
import rule5 from './elastic_endpoint_security_cred_dumping_prevented.json';
import rule6 from './elastic_endpoint_security_cred_manipulation_detected.json';
import rule7 from './elastic_endpoint_security_cred_manipulation_prevented.json';
import rule8 from './elastic_endpoint_security_exploit_detected.json';
import rule9 from './elastic_endpoint_security_exploit_prevented.json';
import rule10 from './elastic_endpoint_security_malware_detected.json';
import rule11 from './elastic_endpoint_security_malware_prevented.json';
import rule12 from './elastic_endpoint_security_permission_theft_detected.json';
import rule13 from './elastic_endpoint_security_permission_theft_prevented.json';
import rule14 from './elastic_endpoint_security_process_injection_detected.json';
import rule15 from './elastic_endpoint_security_process_injection_prevented.json';
import rule16 from './elastic_endpoint_security_ransomware_detected.json';
import rule17 from './elastic_endpoint_security_ransomware_prevented.json';
import rule18 from './eql_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule19 from './eql_adobe_hijack_persistence.json';
import rule20 from './eql_clearing_windows_event_logs.json';
import rule21 from './eql_delete_volume_usn_journal_with_fsutil.json';
import rule22 from './eql_deleting_backup_catalogs_with_wbadmin.json';
import rule23 from './eql_direct_outbound_smb_connection.json';
import rule24 from './eql_disable_windows_firewall_rules_with_netsh.json';
import rule25 from './eql_encoding_or_decoding_files_via_certutil.json';
import rule26 from './eql_local_scheduled_task_commands.json';
import rule27 from './eql_local_service_commands.json';
import rule28 from './eql_msbuild_making_network_connections.json';
import rule29 from './eql_mshta_making_network_connections.json';
import rule30 from './eql_psexec_lateral_movement_command.json';
import rule31 from './eql_suspicious_ms_office_child_process.json';
import rule32 from './eql_suspicious_ms_outlook_child_process.json';
import rule33 from './eql_system_shells_via_services.json';
import rule34 from './eql_unusual_network_connection_via_rundll32.json';
import rule35 from './eql_unusual_parentchild_relationship.json';
import rule36 from './eql_unusual_process_network_connection.json';
import rule37 from './eql_user_account_creation.json';
import rule38 from './eql_volume_shadow_copy_deletion_via_vssadmin.json';
import rule39 from './eql_volume_shadow_copy_deletion_via_wmic.json';
import rule40 from './eql_windows_script_executing_powershell.json';
import rule41 from './linux_hping_activity.json';
import rule42 from './linux_iodine_activity.json';
import rule43 from './linux_kernel_module_activity.json';
import rule44 from './linux_mknod_activity.json';
import rule45 from './linux_netcat_network_connection.json';
import rule46 from './linux_nmap_activity.json';
import rule47 from './linux_nping_activity.json';
import rule48 from './linux_process_started_in_temp_directory.json';
import rule49 from './linux_shell_activity_by_web_server.json';
import rule50 from './linux_socat_activity.json';
import rule51 from './linux_strace_activity.json';
import rule52 from './linux_tcpdump_activity.json';
import rule53 from './linux_whoami_commmand.json';
import rule54 from './network_dns_directly_to_the_internet.json';
import rule55 from './network_ftp_file_transfer_protocol_activity_to_the_internet.json';
import rule56 from './network_irc_internet_relay_chat_protocol_activity_to_the_internet.json';
import rule57 from './network_nat_traversal_port_activity.json';
import rule58 from './network_port_26_activity.json';
import rule59 from './network_port_8000_activity_to_the_internet.json';
import rule60 from './network_pptp_point_to_point_tunneling_protocol_activity.json';
import rule61 from './network_proxy_port_activity_to_the_internet.json';
import rule62 from './network_rdp_remote_desktop_protocol_from_the_internet.json';
import rule63 from './network_rdp_remote_desktop_protocol_to_the_internet.json';
import rule64 from './network_rpc_remote_procedure_call_from_the_internet.json';
import rule65 from './network_rpc_remote_procedure_call_to_the_internet.json';
import rule66 from './network_smb_windows_file_sharing_activity_to_the_internet.json';
import rule67 from './network_smtp_to_the_internet.json';
import rule68 from './network_sql_server_port_activity_to_the_internet.json';
import rule69 from './network_ssh_secure_shell_from_the_internet.json';
import rule70 from './network_ssh_secure_shell_to_the_internet.json';
import rule71 from './network_telnet_port_activity.json';
import rule72 from './network_tor_activity_to_the_internet.json';
import rule73 from './network_vnc_virtual_network_computing_from_the_internet.json';
import rule74 from './network_vnc_virtual_network_computing_to_the_internet.json';
import rule75 from './null_user_agent.json';
import rule76 from './sqlmap_user_agent.json';
import rule77 from './windows_command_prompt_connecting_to_the_internet.json';
import rule78 from './windows_command_shell_started_by_powershell.json';
import rule79 from './windows_command_shell_started_by_svchost.json';
import rule80 from './windows_defense_evasion_via_filter_manager.json';
import rule81 from './windows_execution_via_compiled_html_file.json';
import rule82 from './windows_execution_via_regsvr32.json';
import rule83 from './windows_execution_via_trusted_developer_utilities.json';
import rule84 from './windows_html_help_executable_program_connecting_to_the_internet.json';
import rule85 from './windows_misc_lolbin_connecting_to_the_internet.json';
import rule86 from './windows_persistence_via_application_shimming.json';
import rule87 from './windows_priv_escalation_via_accessibility_features.json';
import rule88 from './windows_process_discovery_via_tasklist_command.json';
import rule89 from './windows_register_server_program_connecting_to_the_internet.json';
import rule90 from './windows_signed_binary_proxy_execution.json';
import rule91 from './windows_suspicious_process_started_by_a_script.json';
import rule92 from './windows_whoami_command_activity.json';
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
];
