/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/convert_saved_search_rules.js
// Do not hand edit. Run the script against a set of saved searches instead

import rule1 from './eql_bypass_uac_via_sdclt.json';
import rule2 from './eql_clearing_windows_event_logs.json';
import rule3 from './eql_suspicious_ms_office_child_process.json';
import rule4 from './eql_bypass_uac_event_viewer.json';
import rule5 from './eql_volume_shadow_copy_deletion_via_wmic.json';
import rule6 from './eql_adobe_hijack_persistence.json';
import rule7 from './eql_unusual_network_connection_via_rundll32.json';
import rule8 from './eql_delete_volume_usn_journal_with_fsutil.json';
import rule9 from './eql_mshta_making_network_connections.json';
import rule10 from './eql_unusual_process_network_connection.json';
import rule11 from './eql_suspicious_ms_outlook_child_process.json';
import rule12 from './eql_audio_capture_via_soundrecorder.json';
import rule13 from './eql_direct_outbound_smb_connection.json';
import rule14 from './eql_windows_script_executing_powershell.json';
import rule15 from './eql_deleting_backup_catalogs_with_wbadmin.json';
import rule16 from './eql_suspicious_pdf_reader_child_process.json';
import rule17 from './eql_local_service_commands.json';
import rule18 from './eql_dll_search_order_hijack.json';
import rule19 from './eql_bypass_uac_via_cmstp.json';
import rule20 from './eql_user_account_creation.json';
import rule21 from './eql_wmic_command_lateral_movement.json';
import rule22 from './eql_system_shells_via_services.json';
import rule23 from './eql_msxsl_making_network_connections.json';
import rule24 from './eql_local_scheduled_task_commands.json';
import rule25 from './eql_msbuild_making_network_connections.json';
import rule26 from './eql_encoding_or_decoding_files_via_certutil.json';
import rule27 from './eql_disable_windows_firewall_rules_with_netsh.json';
import rule28 from './eql_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule29 from './eql_psexec_lateral_movement_command.json';
import rule30 from './eql_user_added_to_administrator_group.json';
import rule31 from './eql_audio_capture_via_powershell.json';
import rule32 from './eql_unusual_parentchild_relationship.json';
import rule33 from './eql_modification_of_boot_configuration.json';
import rule34 from './eql_volume_shadow_copy_deletion_via_vssadmin.json';
import rule35 from './zeek_notice_signaturesmultiple_sig_responders.json';
import rule36 from './zeek_notice_packetfiltercompile_failure.json';
import rule37 from './zeek_notice_signaturescount_signature.json';
import rule38 from './zeek_notice_signaturesmultiple_signatures.json';
import rule39 from './zeek_notice_signaturessignature_summary.json';
import rule40 from './zeek_notice_signaturessensitive_signature.json';
import rule41 from './zeek_notice_packetfilterinstall_failure.json';
import rule42 from './zeek_notice_weirdactivity.json';
import rule43 from './zeek_notice_noticetally.json';
import rule44 from './zeek_notice_packetfilterno_more_conn_shunts_available.json';
import rule45 from './zeek_notice_packetfiltercannot_bpf_shunt_conn.json';
import rule46 from './zeek_notice_teamcymrumalwarehashregistrymatch.json';
import rule47 from './zeek_notice_softwaresoftware_version_change.json';
import rule48 from './zeek_notice_protocoldetectorserver_found.json';
import rule49 from './zeek_notice_packetfiltertoo_long_to_compile_filter.json';
import rule50 from './zeek_notice_protocoldetectorprotocol_found.json';
import rule51 from './zeek_notice_intelnotice.json';
import rule52 from './zeek_notice_packetfilterdropped_packets.json';
import rule53 from './zeek_notice_scanaddress_scan.json';
import rule54 from './zeek_notice_ftpbruteforcing.json';
import rule55 from './zeek_notice_scanport_scan.json';
import rule56 from './zeek_notice_dnsexternal_name.json';
import rule57 from './zeek_notice_capturelosstoo_much_loss.json';
import rule58 from './zeek_notice_softwarevulnerable_version.json';
import rule59 from './zeek_notice_connretransmission_inconsistency.json';
import rule60 from './zeek_notice_traceroutedetected.json';
import rule61 from './zeek_notice_conncontent_gap.json';
import rule62 from './zeek_notice_smtpblocklist_blocked_host.json';
import rule63 from './zeek_notice_httpsql_injection_victim.json';
import rule64 from './zeek_notice_sshlogin_by_password_guesser.json';
import rule65 from './zeek_notice_sshpassword_guessing.json';
import rule66 from './zeek_notice_sshwatched_country_login.json';
import rule67 from './zeek_notice_ftpsite_exec_success.json';
import rule68 from './zeek_notice_smtpsuspicious_origination.json';
import rule69 from './zeek_notice_httpsql_injection_attacker.json';
import rule70 from './zeek_notice_smtpblocklist_error_message.json';
import rule71 from './zeek_notice_sshinteresting_hostname_login.json';
import rule72 from './zeek_notice_sslinvalid_server_cert.json';
import rule73 from './zeek_notice_heartbleedssl_heartbeat_many_requests.json';
import rule74 from './zeek_notice_heartbleedssl_heartbeat_odd_length.json';
import rule75 from './zeek_notice_sslcertificate_expired.json';
import rule76 from './zeek_notice_sslcertificate_expires_soon.json';
import rule77 from './zeek_notice_heartbleedssl_heartbeat_attack_success.json';
import rule78 from './zeek_notice_sslcertificate_not_valid_yet.json';
import rule79 from './zeek_notice_heartbleedssl_heartbeat_attack.json';
import rule80 from './zeek_notice_sslinvalid_ocsp_response.json';
import rule81 from './zeek_notice_sslweak_key.json';
import rule82 from './zeek_notice_sslold_version.json';
import rule83 from './zeek_notice_sslweak_cipher.json';
import rule84 from './suricata_category_large_scale_information_leak.json';
import rule85 from './suricata_category_attempted_information_leak.json';
import rule86 from './suricata_category_not_suspicious_traffic.json';
import rule87 from './suricata_category_potentially_bad_traffic.json';
import rule88 from './suricata_category_information_leak.json';
import rule89 from './suricata_category_unknown_traffic.json';
import rule90 from './suricata_category_successful_administrator_privilege_gain.json';
import rule91 from './suricata_category_attempted_administrator_privilege_gain.json';
import rule92 from './suricata_category_unsuccessful_user_privilege_gain.json';
import rule93 from './suricata_category_successful_user_privilege_gain.json';
import rule94 from './suricata_category_attempted_user_privilege_gain.json';
import rule95 from './suricata_category_attempted_denial_of_service.json';
import rule96 from './suricata_category_decode_of_an_rpc_query.json';
import rule97 from './suricata_category_denial_of_service.json';
import rule98 from './suricata_category_attempted_login_with_suspicious_username.json';
import rule99 from './suricata_category_client_using_unusual_port.json';
import rule100 from './suricata_category_suspicious_filename_detected.json';
import rule101 from './suricata_category_a_suspicious_string_was_detected.json';
import rule102 from './suricata_category_tcp_connection_detected.json';
import rule103 from './suricata_category_executable_code_was_detected.json';
import rule104 from './suricata_category_network_trojan_detected.json';
import rule105 from './suricata_category_system_call_detected.json';
import rule106 from './suricata_category_potentially_vulnerable_web_application_access.json';
import rule107 from './suricata_category_nonstandard_protocol_or_event.json';
import rule108 from './suricata_category_denial_of_service_attack.json';
import rule109 from './suricata_category_generic_protocol_command_decode.json';
import rule110 from './suricata_category_network_scan_detected.json';
import rule111 from './suricata_category_web_application_attack.json';
import rule112 from './suricata_category_generic_icmp_event.json';
import rule113 from './suricata_category_misc_attack.json';
import rule114 from './suricata_category_default_username_and_password_login_attempt.json';
import rule115 from './suricata_category_external_ip_address_retrieval.json';
import rule116 from './suricata_category_potential_corporate_privacy_violation.json';
import rule117 from './suricata_category_targeted_malicious_activity.json';
import rule118 from './suricata_category_observed_c2_domain.json';
import rule119 from './suricata_category_exploit_kit_activity.json';
import rule120 from './suricata_category_possibly_unwanted_program.json';
import rule121 from './suricata_category_successful_credential_theft.json';
import rule122 from './suricata_category_possible_social_engineering_attempted.json';
import rule123 from './suricata_category_crypto_currency_mining_activity.json';
import rule124 from './suricata_category_malware_command_and_control_activity.json';
import rule125 from './suricata_category_misc_activity.json';
import rule126 from './windows_powershell_connecting_to_the_internet.json';
import rule127 from './windows_net_user_command_activity.json';
import rule128 from './windows_image_load_from_a_temp_directory.json';
import rule129 from './network_ssh_secure_shell_to_the_internet.json';
import rule130 from './suricata_nonhttp_traffic_on_tcp_port_80.json';
import rule131 from './windows_misc_lolbin_connecting_to_the_internet.json';
import rule132 from './linux_strace_activity.json';
import rule133 from './suricata_directory_reversal_characters_in_an_http_request.json';
import rule134 from './suricata_dns_traffic_on_unusual_udp_port.json';
import rule135 from './network_telnet_port_activity.json';
import rule136 from './suricata_directory_traversal_in_downloaded_zip_file.json';
import rule137 from './windows_execution_via_microsoft_html_application_hta.json';
import rule138 from './windows_credential_dumping_commands.json';
import rule139 from './windows_net_command_activity_by_the_system_account.json';
import rule140 from './windows_register_server_program_connecting_to_the_internet.json';
import rule141 from './linux_java_process_connecting_to_the_internet.json';
import rule142 from './suricata_imap_traffic_on_unusual_port_internet_destination.json';
import rule143 from './suricata_double_encoded_characters_in_a_uri.json';
import rule144 from './network_tor_activity_to_the_internet.json';
import rule145 from './windows_registry_query_local.json';
import rule146 from './linux_netcat_network_connection.json';
import rule147 from './windows_defense_evasion_via_filter_manager.json';
import rule148 from './suricata_nondns_traffic_on_udp_port_53.json';
import rule149 from './suricata_double_encoded_characters_in_an_http_post.json';
import rule150 from './command_shell_started_by_internet_explorer.json';
import rule151 from './network_vnc_virtual_network_computing_from_the_internet.json';
import rule152 from './windows_nmap_activity.json';
import rule153 from './suspicious_process_started_by_a_script.json';
import rule154 from './windows_network_anomalous_windows_process_using_https_ports.json';
import rule155 from './powershell_network_connection.json';
import rule156 from './windows_signed_binary_proxy_execution.json';
import rule157 from './linux_kernel_module_activity.json';
import rule158 from './network_vnc_virtual_network_computing_to_the_internet.json';
import rule159 from './suricata_mimikatz_string_detected_in_http_response.json';
import rule160 from './command_shell_started_by_svchost.json';
import rule161 from './linux_tcpdump_activity.json';
import rule162 from './process_started_by_ms_office_program_possible_payload.json';
import rule163 from './windows_signed_binary_proxy_execution_download.json';
import rule164 from './suricata_base64_encoded_startprocess_powershell_execution.json';
import rule165 from './suricata_base64_encoded_invokecommand_powershell_execution.json';
import rule166 from './suricata_directory_traversal_characters_in_http_response.json';
import rule167 from './windows_microsoft_html_application_hta_connecting_to_the_internet.json';
import rule168 from './suricata_tls_traffic_on_unusual_port_internet_destination.json';
import rule169 from './process_started_by_acrobat_reader_possible_payload.json';
import rule170 from './suricata_http_traffic_on_unusual_port_internet_destination.json';
import rule171 from './windows_persistence_via_modification_of_existing_service.json';
import rule172 from './windows_defense_evasion_or_persistence_via_hidden_files.json';
import rule173 from './windows_execution_via_compiled_html_file.json';
import rule174 from './linux_ptrace_activity.json';
import rule175 from './suricata_nonimap_traffic_on_port_1443_imap.json';
import rule176 from './windows_scheduled_task_activity.json';
import rule177 from './suricata_ftp_traffic_on_unusual_port_internet_destination.json';
import rule178 from './windows_wireshark_activity.json';
import rule179 from './windows_execution_via_trusted_developer_utilities.json';
import rule180 from './suricata_rpc_traffic_on_http_ports.json';
import rule181 from './windows_process_discovery_via_tasklist_command.json';
import rule182 from './suricata_cobaltstrike_artifact_in_an_dns_request.json';
import rule183 from './suricata_serialized_php_detected.json';
import rule184 from './windows_background_intelligent_transfer_service_bits_connecting_to_the_internet.json';
import rule185 from './windows_registry_query_network.json';
import rule186 from './windows_persistence_via_application_shimming.json';
import rule187 from './network_proxy_port_activity_to_the_internet.json';
import rule188 from './windows_whoami_command_activity.json';
import rule189 from './suricata_shell_exec_php_function_in_an_http_post.json';
import rule190 from './windump_activity.json';
import rule191 from './windows_management_instrumentation_wmi_execution.json';
import rule192 from './network_rdp_remote_desktop_protocol_from_the_internet.json';
import rule193 from './windows_priv_escalation_via_accessibility_features.json';
import rule194 from './psexec_activity.json';
import rule195 from './linux_rawshark_activity.json';
import rule196 from './suricata_nonftp_traffic_on_port_21.json';
import rule197 from './network_ftp_file_transfer_protocol_activity_to_the_internet.json';
import rule198 from './windows_certutil_connecting_to_the_internet.json';
import rule199 from './suricata_nonsmb_traffic_on_tcp_port_139_smb.json';
import rule200 from './network_rdp_remote_desktop_protocol_to_the_internet.json';
import rule201 from './linux_whoami_commmand.json';
import rule202 from './windows_persistence_or_priv_escalation_via_hooking.json';
import rule203 from './linux_lzop_activity_possible_julianrunnels.json';
import rule204 from './suricata_nontls_on_tls_port.json';
import rule205 from './network_irc_internet_relay_chat_protocol_activity_to_the_internet.json';
import rule206 from './linux_network_anomalous_process_using_https_ports.json';
import rule207 from './windows_credential_dumping_via_registry_save.json';
import rule208 from './network_rpc_remote_procedure_call_from_the_internet.json';
import rule209 from './windows_credential_dumping_via_imageload.json';
import rule210 from './windows_burp_ce_activity.json';
import rule211 from './linux_hping_activity.json';
import rule212 from './windows_command_prompt_connecting_to_the_internet.json';
import rule213 from './network_nat_traversal_port_activity.json';
import rule214 from './network_rpc_remote_procedure_call_to_the_internet.json';
import rule215 from './suricata_possible_cobalt_strike_malleable_c2_null_response.json';
import rule216 from './windows_remote_management_execution.json';
import rule217 from './suricata_lazagne_artifact_in_an_http_post.json';
import rule218 from './windows_netcat_network_activity.json';
import rule219 from './windows_iodine_activity.json';
import rule220 from './network_port_26_activity.json';
import rule221 from './windows_execution_via_connection_manager.json';
import rule222 from './linux_process_started_in_temp_directory.json';
import rule223 from './suricata_eval_php_function_in_an_http_request.json';
import rule224 from './linux_web_download.json';
import rule225 from './suricata_ssh_traffic_not_on_port_22_internet_destination.json';
import rule226 from './network_port_8000_activity.json';
import rule227 from './windows_process_started_by_the_java_runtime.json';
import rule228 from './suricata_possible_sql_injection_sql_commands_in_http_transactions.json';
import rule229 from './network_smb_windows_file_sharing_activity_to_the_internet.json';
import rule230 from './network_port_8000_activity_to_the_internet.json';
import rule231 from './command_shell_started_by_powershell.json';
import rule232 from './linux_nmap_activity.json';
import rule233 from './search_windows_10.json';
import rule234 from './network_smtp_to_the_internet.json';
import rule235 from './windows_payload_obfuscation_via_certutil.json';
import rule236 from './network_pptp_point_to_point_tunneling_protocol_activity.json';
import rule237 from './linux_unusual_shell_activity.json';
import rule238 from './linux_mknod_activity.json';
import rule239 from './network_sql_server_port_activity_to_the_internet.json';
import rule240 from './suricata_commonly_abused_dns_domain_detected.json';
import rule241 from './linux_iodine_activity.json';
import rule242 from './suricata_mimikatz_artifacts_in_an_http_post.json';
import rule243 from './windows_execution_via_net_com_assemblies.json';
import rule244 from './suricata_dns_traffic_on_unusual_tcp_port.json';
import rule245 from './suricata_base64_encoded_newobject_powershell_execution.json';
import rule246 from './windows_netcat_activity.json';
import rule247 from './windows_persistence_via_bits_jobs.json';
import rule248 from './linux_nping_activity.json';
import rule249 from './windows_execution_via_regsvr32.json';
import rule250 from './process_started_by_windows_defender.json';
import rule251 from './windows_indirect_command_execution.json';
import rule252 from './network_ssh_secure_shell_from_the_internet.json';
import rule253 from './windows_html_help_executable_program_connecting_to_the_internet.json';
import rule254 from './suricata_windows_executable_served_by_jpeg_web_content.json';
import rule255 from './network_dns_directly_to_the_internet.json';
import rule256 from './windows_defense_evasion_via_windows_event_log_tools.json';
import rule257 from './suricata_nondns_traffic_on_tcp_port_53.json';
import rule258 from './windows_persistence_via_netshell_helper_dll.json';
import rule259 from './windows_script_interpreter_connecting_to_the_internet.json';
import rule260 from './windows_defense_evasion_decoding_using_certutil.json';
import rule261 from './linux_shell_activity_by_web_server.json';
import rule262 from './linux_ldso_process_activity.json';
import rule263 from './windows_mimikatz_activity.json';
import rule264 from './suricata_nonssh_traffic_on_port_22.json';
import rule265 from './windows_data_compression_using_powershell.json';
import rule266 from './windows_nmap_scan_activity.json';

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
  rule144,
  rule145,
  rule146,
  rule147,
  rule148,
  rule149,
  rule150,
  rule151,
  rule152,
  rule153,
  rule154,
  rule155,
  rule156,
  rule157,
  rule158,
  rule159,
  rule160,
  rule161,
  rule162,
  rule163,
  rule164,
  rule165,
  rule166,
  rule167,
  rule168,
  rule169,
  rule170,
  rule171,
  rule172,
  rule173,
  rule174,
  rule175,
  rule176,
  rule177,
  rule178,
  rule179,
  rule180,
  rule181,
  rule182,
  rule183,
  rule184,
  rule185,
  rule186,
  rule187,
  rule188,
  rule189,
  rule190,
  rule191,
  rule192,
  rule193,
  rule194,
  rule195,
  rule196,
  rule197,
  rule198,
  rule199,
  rule200,
  rule201,
  rule202,
  rule203,
  rule204,
  rule205,
  rule206,
  rule207,
  rule208,
  rule209,
  rule210,
  rule211,
  rule212,
  rule213,
  rule214,
  rule215,
  rule216,
  rule217,
  rule218,
  rule219,
  rule220,
  rule221,
  rule222,
  rule223,
  rule224,
  rule225,
  rule226,
  rule227,
  rule228,
  rule229,
  rule230,
  rule231,
  rule232,
  rule233,
  rule234,
  rule235,
  rule236,
  rule237,
  rule238,
  rule239,
  rule240,
  rule241,
  rule242,
  rule243,
  rule244,
  rule245,
  rule246,
  rule247,
  rule248,
  rule249,
  rule250,
  rule251,
  rule252,
  rule253,
  rule254,
  rule255,
  rule256,
  rule257,
  rule258,
  rule259,
  rule260,
  rule261,
  rule262,
  rule263,
  rule264,
  rule265,
  rule266,
];
