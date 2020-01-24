/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/regen_prepackage_rules_index.sh
// Do not hand edit. Run that script to regenerate package information instead

import rule1 from './403_response_to_a_post.json';
import rule2 from './405_response_method_not_allowed.json';
import rule3 from './500_response_on_admin_page.json';
import rule4 from './eql_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule5 from './eql_adobe_hijack_persistence.json';
import rule6 from './eql_audio_capture_via_powershell.json';
import rule7 from './eql_audio_capture_via_soundrecorder.json';
import rule8 from './eql_bypass_uac_event_viewer.json';
import rule9 from './eql_bypass_uac_via_cmstp.json';
import rule10 from './eql_bypass_uac_via_sdclt.json';
import rule11 from './eql_clearing_windows_event_logs.json';
import rule12 from './eql_delete_volume_usn_journal_with_fsutil.json';
import rule13 from './eql_deleting_backup_catalogs_with_wbadmin.json';
import rule14 from './eql_direct_outbound_smb_connection.json';
import rule15 from './eql_disable_windows_firewall_rules_with_netsh.json';
import rule16 from './eql_dll_search_order_hijack.json';
import rule17 from './eql_encoding_or_decoding_files_via_certutil.json';
import rule18 from './eql_local_scheduled_task_commands.json';
import rule19 from './eql_local_service_commands.json';
import rule20 from './eql_modification_of_boot_configuration.json';
import rule21 from './eql_msbuild_making_network_connections.json';
import rule22 from './eql_mshta_making_network_connections.json';
import rule23 from './eql_msxsl_making_network_connections.json';
import rule24 from './eql_psexec_lateral_movement_command.json';
import rule25 from './eql_suspicious_ms_office_child_process.json';
import rule26 from './eql_suspicious_ms_outlook_child_process.json';
import rule27 from './eql_suspicious_pdf_reader_child_process.json';
import rule28 from './eql_system_shells_via_services.json';
import rule29 from './eql_unusual_network_connection_via_rundll32.json';
import rule30 from './eql_unusual_parentchild_relationship.json';
import rule31 from './eql_unusual_process_network_connection.json';
import rule32 from './eql_user_account_creation.json';
import rule33 from './eql_user_added_to_administrator_group.json';
import rule34 from './eql_volume_shadow_copy_deletion_via_vssadmin.json';
import rule35 from './eql_volume_shadow_copy_deletion_via_wmic.json';
import rule36 from './eql_windows_script_executing_powershell.json';
import rule37 from './eql_wmic_command_lateral_movement.json';
import rule38 from './linux_hping_activity.json';
import rule39 from './linux_iodine_activity.json';
import rule40 from './linux_kernel_module_activity.json';
import rule41 from './linux_ldso_process_activity.json';
import rule42 from './linux_lzop_activity.json';
import rule43 from './linux_mknod_activity.json';
import rule44 from './linux_netcat_network_connection.json';
import rule45 from './linux_network_anomalous_process_using_https_ports.json';
import rule46 from './linux_nmap_activity.json';
import rule47 from './linux_nping_activity.json';
import rule48 from './linux_process_started_in_temp_directory.json';
import rule49 from './linux_ptrace_activity.json';
import rule50 from './linux_rawshark_activity.json';
import rule51 from './linux_shell_activity_by_web_server.json';
import rule52 from './linux_socat_activity.json';
import rule53 from './linux_ssh_forwarding.json';
import rule54 from './linux_strace_activity.json';
import rule55 from './linux_tcpdump_activity.json';
import rule56 from './linux_web_download.json';
import rule57 from './linux_whoami_commmand.json';
import rule58 from './network_dns_directly_to_the_internet.json';
import rule59 from './network_ftp_file_transfer_protocol_activity_to_the_internet.json';
import rule60 from './network_irc_internet_relay_chat_protocol_activity_to_the_internet.json';
import rule61 from './network_nat_traversal_port_activity.json';
import rule62 from './network_port_26_activity.json';
import rule63 from './network_port_8000_activity.json';
import rule64 from './network_port_8000_activity_to_the_internet.json';
import rule65 from './network_pptp_point_to_point_tunneling_protocol_activity.json';
import rule66 from './network_proxy_port_activity_to_the_internet.json';
import rule67 from './network_rdp_remote_desktop_protocol_from_the_internet.json';
import rule68 from './network_rdp_remote_desktop_protocol_to_the_internet.json';
import rule69 from './network_rpc_remote_procedure_call_from_the_internet.json';
import rule70 from './network_rpc_remote_procedure_call_to_the_internet.json';
import rule71 from './network_smb_windows_file_sharing_activity_to_the_internet.json';
import rule72 from './network_smtp_to_the_internet.json';
import rule73 from './network_sql_server_port_activity_to_the_internet.json';
import rule74 from './network_ssh_secure_shell_from_the_internet.json';
import rule75 from './network_ssh_secure_shell_to_the_internet.json';
import rule76 from './network_telnet_port_activity.json';
import rule77 from './network_tor_activity_to_the_internet.json';
import rule78 from './network_vnc_virtual_network_computing_from_the_internet.json';
import rule79 from './network_vnc_virtual_network_computing_to_the_internet.json';
import rule80 from './null_user_agent.json';
import rule81 from './sqlmap_user_agent.json';
import rule82 from './windows_background_intelligent_transfer_service_bits_connecting_to_the_internet.json';
import rule83 from './windows_burp_ce_activity.json';
import rule84 from './windows_certutil_connecting_to_the_internet.json';
import rule85 from './windows_command_prompt_connecting_to_the_internet.json';
import rule86 from './windows_command_shell_started_by_internet_explorer.json';
import rule87 from './windows_command_shell_started_by_powershell.json';
import rule88 from './windows_command_shell_started_by_svchost.json';
import rule89 from './windows_credential_dumping_commands.json';
import rule90 from './windows_credential_dumping_via_imageload.json';
import rule91 from './windows_credential_dumping_via_registry_save.json';
import rule92 from './windows_data_compression_using_powershell.json';
import rule93 from './windows_defense_evasion_decoding_using_certutil.json';
import rule94 from './windows_defense_evasion_or_persistence_via_hidden_files.json';
import rule95 from './windows_defense_evasion_via_filter_manager.json';
import rule96 from './windows_defense_evasion_via_windows_event_log_tools.json';
import rule97 from './windows_execution_via_compiled_html_file.json';
import rule98 from './windows_execution_via_connection_manager.json';
import rule99 from './windows_execution_via_microsoft_html_application_hta.json';
import rule100 from './windows_execution_via_net_com_assemblies.json';
import rule101 from './windows_execution_via_regsvr32.json';
import rule102 from './windows_execution_via_trusted_developer_utilities.json';
import rule103 from './windows_html_help_executable_program_connecting_to_the_internet.json';
import rule104 from './windows_image_load_from_a_temp_directory.json';
import rule105 from './windows_indirect_command_execution.json';
import rule106 from './windows_iodine_activity.json';
import rule107 from './windows_management_instrumentation_wmi_execution.json';
import rule108 from './windows_microsoft_html_application_hta_connecting_to_the_internet.json';
import rule109 from './windows_mimikatz_activity.json';
import rule110 from './windows_misc_lolbin_connecting_to_the_internet.json';
import rule111 from './windows_net_command_activity_by_the_system_account.json';
import rule112 from './windows_net_user_command_activity.json';
import rule113 from './windows_netcat_activity.json';
import rule114 from './windows_netcat_network_activity.json';
import rule115 from './windows_network_anomalous_windows_process_using_https_ports.json';
import rule116 from './windows_nmap_activity.json';
import rule117 from './windows_nmap_scan_activity.json';
import rule118 from './windows_payload_obfuscation_via_certutil.json';
import rule119 from './windows_persistence_or_priv_escalation_via_hooking.json';
import rule120 from './windows_persistence_via_application_shimming.json';
import rule121 from './windows_persistence_via_bits_jobs.json';
import rule122 from './windows_persistence_via_modification_of_existing_service.json';
import rule123 from './windows_persistence_via_netshell_helper_dll.json';
import rule124 from './windows_powershell_connecting_to_the_internet.json';
import rule125 from './windows_priv_escalation_via_accessibility_features.json';
import rule126 from './windows_process_discovery_via_tasklist_command.json';
import rule127 from './windows_process_execution_via_wmi.json';
import rule128 from './windows_process_started_by_acrobat_reader_possible_payload.json';
import rule129 from './windows_process_started_by_ms_office_program_possible_payload.json';
import rule130 from './windows_process_started_by_the_java_runtime.json';
import rule131 from './windows_psexec_activity.json';
import rule132 from './windows_register_server_program_connecting_to_the_internet.json';
import rule133 from './windows_registry_query_local.json';
import rule134 from './windows_registry_query_network.json';
import rule135 from './windows_remote_management_execution.json';
import rule136 from './windows_scheduled_task_activity.json';
import rule137 from './windows_script_interpreter_connecting_to_the_internet.json';
import rule138 from './windows_signed_binary_proxy_execution.json';
import rule139 from './windows_signed_binary_proxy_execution_download.json';
import rule140 from './windows_suspicious_process_started_by_a_script.json';
import rule141 from './windows_whoami_command_activity.json';
import rule142 from './windows_windump_activity.json';
import rule143 from './windows_wireshark_activity.json';
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
  rule94,
  rule95,
  rule96,
  rule97,
  rule98,
  rule99,
  rule100,
  rule101,
  rule102,
  rule103,
  rule104,
  rule105,
  rule106,
  rule107,
  rule108,
  rule109,
  rule110,
  rule111,
  rule112,
  rule113,
  rule114,
  rule115,
  rule116,
  rule117,
  rule118,
  rule119,
  rule120,
  rule121,
  rule122,
  rule123,
  rule124,
  rule125,
  rule126,
  rule127,
  rule128,
  rule129,
  rule130,
  rule131,
  rule132,
  rule133,
  rule134,
  rule135,
  rule136,
  rule137,
  rule138,
  rule139,
  rule140,
  rule141,
  rule142,
  rule143,
];
