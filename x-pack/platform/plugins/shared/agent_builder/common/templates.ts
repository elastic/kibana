/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const CONVERSATION_TEMPLATES: ReadonlyArray<ConversationTemplate> = [
  {
    id: 'account-compromise',
    name: 'Account Compromise',
    description:
      'Investigate suspected or confirmed account takeover and credential theft. Capture the authentication context, systems accessed, and all remediation steps.',
    definition: {
      fields: [
        {
          name: 'compromised_account',
          type: 'keyword',
          description: 'UPN or username of the compromised account.',
        },
        {
          name: 'account_type',
          type: 'keyword',
          description:
            'Type of account. One of: Standard user, Service account, Privileged / admin, Shared / generic account.',
          validation: {
            allowed_values: [
              'Standard user',
              'Service account',
              'Privileged / admin',
              'Shared / generic account',
            ],
          },
        },
        {
          name: 'detection_method',
          type: 'keyword',
          description:
            'How the compromise was detected. One of: Impossible travel alert, Brute force / password spray, Credential stuffing, Threat intelligence feed, Anomalous login behavior, User self-report, Dark web credential alert.',
          validation: {
            allowed_values: [
              'Impossible travel alert',
              'Brute force / password spray',
              'Credential stuffing',
              'Threat intelligence feed',
              'Anomalous login behavior',
              'User self-report',
              'Dark web credential alert',
            ],
          },
        },
        {
          name: 'source_ip',
          type: 'keyword',
          description: 'Suspicious source IP address seen in authentication logs.',
        },
        {
          name: 'mfa_enabled',
          type: 'boolean',
          description: 'Whether MFA was enrolled on this account (true or false).',
          value: 'false',
        },
        {
          name: 'mfa_bypass_suspected',
          type: 'boolean',
          description:
            'Whether MFA bypass is suspected (true or false). Only relevant when mfa_enabled is true.',
          value: 'false',
        },
        {
          name: 'affected_systems',
          type: 'text',
          description:
            'Comma-separated list of systems or services accessed with the compromised account.',
        },
        {
          name: 'persistence_mechanisms_found',
          type: 'text',
          description:
            'Persistence mechanisms discovered and removed. List applicable: inbox/mail forwarding rules, OAuth app grants, MFA device registrations, API keys / personal access tokens.',
        },
        {
          name: 'disposition',
          type: 'keyword',
          description: 'Investigation outcome.',
          validation: { allowed_values: ['true_positive', 'false_positive', 'benign_positive'] },
        },
      ],
    },
  },
  {
    id: 'cloud-security-incident',
    name: 'Cloud Security Incident',
    description:
      'Investigate cloud infrastructure and SaaS incidents including misconfigurations, IAM abuse, and workload compromise. Capture affected resources and all remediation steps.',
    definition: {
      fields: [
        {
          name: 'cloud_provider',
          type: 'keyword',
          description: 'Cloud provider where the incident occurred.',
          validation: {
            allowed_values: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Multi-cloud', 'Other'],
          },
        },
        {
          name: 'affected_resource',
          type: 'keyword',
          description: 'Name or ARN/ID of the affected resource or service.',
        },
        {
          name: 'resource_type',
          type: 'keyword',
          description:
            'Type of cloud resource. One of: Storage bucket or blob, IAM role or user, Virtual machine or instance, Container or pod, Serverless function, Database, Network resource, Other.',
          validation: {
            allowed_values: [
              'Storage bucket or blob',
              'IAM role or user',
              'Virtual machine or instance',
              'Container or pod',
              'Serverless function',
              'Database',
              'Network resource',
              'Other',
            ],
          },
        },
        {
          name: 'incident_type',
          type: 'text',
          description:
            'Type(s) of cloud incident (comma-separated if multiple). Options: Misconfiguration (publicly exposed resource), IAM abuse or privilege escalation, Sensitive data exposure, Cryptomining workload detected, Cloud workload compromise, API key or credential leak, Unauthorized console or API access.',
        },
        {
          name: 'publicly_exposed',
          type: 'boolean',
          description:
            'Whether the resource was publicly accessible at time of incident (true or false).',
          value: 'false',
        },
        {
          name: 'sensitive_data_at_risk',
          type: 'boolean',
          description: 'Whether sensitive data was potentially exposed (true or false).',
          value: 'false',
        },
        {
          name: 'affected_account_count',
          type: 'integer',
          description: 'Number of cloud accounts affected.',
          value: '1',
          validation: { min: 1 },
        },
        {
          name: 'audit_logs_preserved',
          type: 'boolean',
          description:
            'Whether cloud audit logs have been preserved for forensics (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'ddos-availability',
    name: 'DDoS / Availability Incident',
    description:
      'Track distributed denial-of-service attacks and service availability incidents. Document attack characteristics, mitigation actions, and time to service restoration.',
    definition: {
      fields: [
        {
          name: 'affected_service',
          type: 'keyword',
          description: 'Name of the service or system experiencing the outage or degradation.',
        },
        {
          name: 'attack_type',
          type: 'keyword',
          description: 'Type of DDoS attack observed.',
          validation: {
            allowed_values: [
              'Volumetric (UDP or ICMP flood)',
              'Protocol (SYN flood)',
              'Application layer (HTTP flood)',
              'Amplification (DNS, NTP, or memcached)',
              'Multi-vector',
              'Unknown',
            ],
          },
        },
        {
          name: 'service_status',
          type: 'keyword',
          description: 'Current availability status of the affected service.',
          validation: {
            allowed_values: [
              'Fully degraded or offline',
              'Partially degraded',
              'Mitigation in progress',
              'Recovered',
            ],
          },
        },
        {
          name: 'peak_traffic_volume',
          type: 'keyword',
          description: 'Peak observed attack traffic (e.g. "450 Gbps", "10 Mrps").',
        },
        {
          name: 'attack_source',
          type: 'keyword',
          description: 'Known attack source IPs, ranges, or ASNs.',
        },
        {
          name: 'estimated_downtime_minutes',
          type: 'integer',
          description: 'Total estimated downtime in minutes.',
          value: '0',
          validation: { min: 0 },
        },
        {
          name: 'mitigation_actions',
          type: 'text',
          description:
            'Comma-separated mitigation actions applied. Options: Rate limiting applied, Source IP blocklist updated, CDN or scrubbing center engaged, Traffic diverted via anycast routing, ISP null-routing requested, WAF rules updated, DDoS protection service activated.',
        },
      ],
    },
  },
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration',
    description:
      'Investigate suspected or confirmed unauthorized data transfer outside the organization. Capture data classification, exfiltration method, and all regulatory notification obligations.',
    definition: {
      fields: [
        {
          name: 'source_account',
          type: 'keyword',
          description: 'Username or account associated with the data transfer.',
        },
        {
          name: 'data_classification',
          type: 'keyword',
          description: 'Classification level of the exfiltrated data.',
          validation: {
            allowed_values: [
              'Public',
              'Internal',
              'Confidential',
              'Restricted / PII',
              'Regulated (PCI, PHI, or similar)',
            ],
          },
        },
        {
          name: 'estimated_volume',
          type: 'keyword',
          description: 'Estimated data volume transferred (e.g. "500 MB", "10,000 records").',
        },
        {
          name: 'exfil_method',
          type: 'text',
          description:
            'Exfiltration method(s) observed (comma-separated). Options: Cloud storage upload, Email to external address, USB / removable media, FTP / SFTP, Web upload / HTTP POST, Printing or physical removal, Unknown.',
        },
        {
          name: 'exfil_destination',
          type: 'keyword',
          description: 'Destination IP address, domain, or cloud service.',
        },
        {
          name: 'detection_source',
          type: 'keyword',
          description: 'How the exfiltration was detected.',
          validation: {
            allowed_values: [
              'DLP alert',
              'UEBA / behavioral anomaly',
              'Network monitoring',
              'Threat intelligence',
              'Audit log review',
              'User report',
            ],
          },
        },
        {
          name: 'insider_suspected',
          type: 'boolean',
          description: 'Whether an insider threat is suspected (true or false).',
          value: 'false',
        },
        {
          name: 'breach_notification_required',
          type: 'boolean',
          description: 'Whether regulatory breach notification is required (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'endpoint-compromise',
    name: 'Endpoint Compromise',
    description:
      'Investigate suspicious activity or confirmed compromise on a single endpoint. Capture forensic findings, compromise indicators, and all remediation actions.',
    definition: {
      fields: [
        {
          name: 'hostname',
          type: 'keyword',
          description: 'Name of the compromised host.',
        },
        {
          name: 'os_type',
          type: 'keyword',
          description: 'Operating system of the affected host.',
          validation: { allowed_values: ['Windows', 'macOS', 'Linux', 'Other'] },
        },
        {
          name: 'associated_user',
          type: 'keyword',
          description: 'Username or account associated with the compromised host.',
        },
        {
          name: 'compromise_indicators',
          type: 'text',
          description:
            'Compromise indicators observed (comma-separated). Options: Malware or suspicious executable, Unauthorized remote access, Persistence mechanism (registry / scheduled task), Credential theft artifact (LSASS dump / keylogger), Exploit artifact, Suspicious process chain.',
        },
        {
          name: 'host_isolated',
          type: 'boolean',
          description: 'Whether the host has been isolated from the network (true or false).',
          value: 'false',
        },
        {
          name: 'business_impact',
          type: 'keyword',
          description: 'Assessed business impact of this compromise.',
          validation: { allowed_values: ['None', 'Low', 'Medium', 'High', 'Critical'] },
        },
        {
          name: 'reimaging_required',
          type: 'boolean',
          description:
            'Whether the host requires reimaging before returning to service (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'insider-threat',
    name: 'Insider Threat',
    description:
      'Investigate suspected insider threat activity including data theft, sabotage, and policy violations. Obtain HR and legal authorization before beginning formal investigation procedures.',
    definition: {
      fields: [
        {
          name: 'subject_account',
          type: 'keyword',
          description: 'Username or account of the subject under investigation.',
        },
        {
          name: 'subject_department',
          type: 'keyword',
          description: "Subject's department or team.",
        },
        {
          name: 'employment_status',
          type: 'keyword',
          description: "Subject's current employment status.",
          validation: {
            allowed_values: [
              'Active employee',
              'Contractor or vendor',
              'Recently resigned',
              'Terminated',
            ],
          },
        },
        {
          name: 'threat_type',
          type: 'text',
          description:
            'Suspected threat type(s) (comma-separated). Options: Data theft (IP or customer data), Sabotage or system damage, Privilege or access abuse, Acceptable use policy violation, Unauthorized system or data access, Fraud or financial misconduct.',
        },
        {
          name: 'hr_authorized',
          type: 'boolean',
          description: 'Whether HR has authorized the investigation (true or false).',
          value: 'false',
        },
        {
          name: 'legal_notified',
          type: 'boolean',
          description: 'Whether legal has been notified (true or false).',
          value: 'false',
        },
        {
          name: 'access_revoked',
          type: 'boolean',
          description: 'Whether system access has been revoked (true or false).',
          value: 'false',
        },
        {
          name: 'evidence_preserved',
          type: 'boolean',
          description:
            'Whether evidence has been preserved per legal hold procedure (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'lateral-movement',
    name: 'Lateral Movement',
    description:
      'Investigate attacker movement within the environment after initial compromise. Identify the source host, techniques used, and all systems reached before containing the spread.',
    definition: {
      fields: [
        {
          name: 'source_host',
          type: 'keyword',
          description: 'Source host used as the initial pivot point.',
        },
        {
          name: 'target_hosts',
          type: 'text',
          description: 'Comma-separated list of destination hosts reached via lateral movement.',
        },
        {
          name: 'techniques_observed',
          type: 'text',
          description:
            'MITRE ATT&CK lateral movement techniques observed (comma-separated). Options: Pass-the-hash, Pass-the-ticket, PsExec, WMI / WMIC, Remote services (SMB or RPC), RDP, SSH, Token impersonation, LOLBins.',
        },
        {
          name: 'credentials_used',
          type: 'keyword',
          description: 'Username or account used for lateral movement.',
        },
        {
          name: 'domain_admin_compromised',
          type: 'boolean',
          description:
            'Whether domain admin credentials are believed to be compromised (true or false).',
          value: 'false',
        },
        {
          name: 'affected_host_count',
          type: 'integer',
          description: 'Total number of hosts confirmed as reached by the attacker.',
          value: '1',
          validation: { min: 1 },
        },
        {
          name: 'containment_status',
          type: 'keyword',
          description: 'Current containment stage.',
          validation: { allowed_values: ['Not started', 'In progress', 'Contained', 'Remediated'] },
        },
      ],
    },
  },
  {
    id: 'malware-ransomware',
    name: 'Malware / Ransomware',
    description:
      'Investigate malware infections including ransomware, trojans, and info stealers. Do not pay a ransom without explicit executive and legal approval.',
    definition: {
      fields: [
        {
          name: 'malware_type',
          type: 'keyword',
          description: 'Primary malware classification.',
          validation: {
            allowed_values: [
              'Ransomware',
              'Trojan / RAT',
              'Info stealer',
              'Backdoor',
              'Worm',
              'Rootkit',
              'Cryptominer',
              'Spyware',
              'Unknown',
            ],
          },
        },
        {
          name: 'malware_family',
          type: 'keyword',
          description:
            'Malware family or specific variant name if identified (e.g. LockBit, Emotet).',
        },
        {
          name: 'affected_host_count',
          type: 'integer',
          description: 'Number of hosts confirmed as infected.',
          value: '1',
          validation: { min: 1 },
        },
        {
          name: 'initial_access_vector',
          type: 'keyword',
          description: 'How the malware gained its initial foothold.',
          validation: {
            allowed_values: [
              'Phishing email',
              'Drive-by exploit',
              'Supply chain compromise',
              'Removable media',
              'Brute force / credential stuffing',
              'Vulnerability exploit',
              'Unknown',
            ],
          },
        },
        {
          name: 'c2_address',
          type: 'keyword',
          description: 'Command-and-control (C2) IP address or domain if identified.',
        },
        {
          name: 'encryption_detected',
          type: 'boolean',
          description:
            'Whether file encryption has been detected (relevant for ransomware). true or false.',
          value: 'false',
        },
        {
          name: 'backup_integrity_verified',
          type: 'boolean',
          description:
            'Whether backups have been verified as intact and unaffected (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'phishing',
    name: 'Phishing Investigation',
    description:
      'Investigate a suspected or confirmed phishing attack. Document the attack vector, affected users, and all containment actions.',
    definition: {
      fields: [
        {
          name: 'reported_by',
          type: 'keyword',
          description: 'How the phishing was first identified.',
          validation: {
            allowed_values: [
              'User report',
              'Email gateway alert',
              'Threat intelligence feed',
              'Automated detection',
            ],
          },
        },
        {
          name: 'attack_vector',
          type: 'keyword',
          description: 'Delivery mechanism used by the attacker.',
          validation: {
            allowed_values: [
              'Email link',
              'Email attachment',
              'SMS / smishing',
              'Voice / vishing',
              'Other',
            ],
          },
        },
        {
          name: 'sender_address',
          type: 'keyword',
          description: 'Sender email address or spoofed domain from the phishing message.',
        },
        {
          name: 'phishing_url',
          type: 'keyword',
          description: 'Phishing URL or malicious domain linked in the message.',
        },
        {
          name: 'affected_user_count',
          type: 'integer',
          description: 'Number of users who received the phishing message.',
          value: '1',
          validation: { min: 1 },
        },
        {
          name: 'users_clicked',
          type: 'integer',
          description: 'Number of users who clicked a link or interacted with the message.',
          value: '0',
          validation: { min: 0 },
        },
        {
          name: 'credential_harvesting_suspected',
          type: 'boolean',
          description: 'Whether credential harvesting is suspected (true or false).',
          value: 'false',
        },
        {
          name: 'attachment_hash',
          type: 'keyword',
          description: 'SHA-256 hash of a malicious attachment, if present.',
          validation: {
            pattern: {
              regex: '^([0-9a-fA-F]{64}|)$',
              message: 'Must be a 64-character SHA-256 hex string or empty',
            },
          },
        },
      ],
    },
  },
  {
    id: 'privileged-access-abuse',
    name: 'Privileged Access Abuse',
    description:
      "Investigate misuse of privileged accounts, unauthorized admin actions, and PAM bypass. Coordinate with the account owner's manager before suspending accounts.",
    definition: {
      fields: [
        {
          name: 'privileged_account',
          type: 'keyword',
          description: 'Username or account of the privileged account involved.',
        },
        {
          name: 'privilege_level',
          type: 'keyword',
          description: 'Level of privilege held by the account.',
          validation: {
            allowed_values: [
              'Local admin',
              'Domain admin',
              'Enterprise admin',
              'Root / superuser',
              'Elevated service account',
              'Cloud IAM admin',
              'Database admin (DBA)',
            ],
          },
        },
        {
          name: 'abuse_type',
          type: 'text',
          description:
            'Type(s) of abuse observed (comma-separated). Options: Unauthorized data access, Change management bypass, Audit log tampering or deletion, Unauthorized account creation, Permission or role escalation, Security tool disabled or modified, Scheduled task or script abuse.',
        },
        {
          name: 'detection_source',
          type: 'keyword',
          description: 'How the abuse was detected.',
          validation: {
            allowed_values: [
              'SIEM alert',
              'UEBA / behavioral anomaly',
              'Peer or manager report',
              'Audit log review',
              'Threat intelligence',
            ],
          },
        },
        {
          name: 'activity_was_authorized',
          type: 'boolean',
          description:
            'Whether the activity was authorized via change management or a break-glass procedure (true or false).',
          value: 'false',
        },
        {
          name: 'authorization_reference',
          type: 'keyword',
          description: 'Change or break-glass authorization reference number, if applicable.',
        },
        {
          name: 'pam_bypass_suspected',
          type: 'boolean',
          description: 'Whether PAM controls are suspected to have been bypassed (true or false).',
          value: 'false',
        },
        {
          name: 'audit_logs_intact',
          type: 'boolean',
          description:
            'Whether audit logs are confirmed intact with no evidence of tampering (true or false).',
          value: 'false',
        },
      ],
    },
  },
  {
    id: 'supply-chain-compromise',
    name: 'Supply Chain / Third-Party Compromise',
    description:
      'Investigate incidents involving a compromised vendor, software dependency, or third-party integration. Track affected components, internal exposure, and vendor coordination through to remediation.',
    definition: {
      fields: [
        {
          name: 'vendor_name',
          type: 'keyword',
          description: 'Name of the affected vendor or supplier.',
        },
        {
          name: 'compromised_component',
          type: 'keyword',
          description: 'Name of the compromised software library, service, or integration.',
        },
        {
          name: 'affected_version',
          type: 'keyword',
          description: 'Version(s) of the component confirmed as affected.',
        },
        {
          name: 'cve_id',
          type: 'keyword',
          description: 'Associated CVE identifier, if applicable (e.g. CVE-2024-12345).',
          validation: {
            pattern: {
              regex: '^(CVE-\\d{4}-\\d{4,}|N/A|Unknown|)$',
              message: 'Enter a valid CVE ID (e.g. CVE-2024-12345), N/A, Unknown, or leave blank',
            },
          },
        },
        {
          name: 'exposure_type',
          type: 'text',
          description:
            'How the supply chain was compromised (comma-separated). Options: Malicious software update / trojanized build, Compromised open-source dependency, Backdoored integration or plugin, API key or credential leak from vendor, Counterfeit / typosquatted component, Vendor infrastructure breach.',
        },
        {
          name: 'affected_internal_systems',
          type: 'text',
          description: 'Internal systems or pipelines that use the compromised component.',
        },
        {
          name: 'exploitation_confirmed',
          type: 'boolean',
          description:
            'Whether active exploitation of the component has been confirmed in the environment (true or false).',
          value: 'false',
        },
        {
          name: 'vendor_notified',
          type: 'boolean',
          description: 'Whether the vendor has been notified (true or false).',
          value: 'false',
        },
        {
          name: 'disclosure_status',
          type: 'keyword',
          description: 'Current public disclosure status of this supply chain compromise.',
          validation: {
            allowed_values: [
              'Not publicly disclosed',
              'Vendor advisory published',
              'Publicly disclosed (CVE or news)',
              'Regulatory notification made',
            ],
          },
        },
      ],
    },
  },
  {
    id: 'vulnerability-exploitation',
    name: 'Vulnerability Exploitation',
    description:
      'Track active exploitation of a known or zero-day vulnerability. Capture CVE details, affected systems, and patch or workaround status.',
    definition: {
      fields: [
        {
          name: 'cve_id',
          type: 'keyword',
          description: 'CVE identifier for the exploited vulnerability (e.g. CVE-2024-12345).',
          validation: {
            pattern: {
              regex: '^(CVE-\\d{4}-\\d{4,}|N/A|Unknown)$',
              message: 'Enter a valid CVE ID, N/A, or Unknown',
            },
          },
        },
        {
          name: 'affected_system',
          type: 'keyword',
          description: 'System or application name where the vulnerability was exploited.',
        },
        {
          name: 'cvss_score',
          type: 'float',
          description: 'CVSS base score (0.0–10.0).',
          validation: { min: 0, max: 10 },
        },
        {
          name: 'exploit_type',
          type: 'keyword',
          description: 'Class of vulnerability being exploited.',
          validation: {
            allowed_values: [
              'Remote code execution (RCE)',
              'Privilege escalation',
              'SQL injection',
              'Cross-site scripting (XSS)',
              'Path traversal',
              'Buffer overflow',
              'Authentication bypass',
              'Server-side request forgery (SSRF)',
              'Other',
            ],
          },
        },
        {
          name: 'network_exposure',
          type: 'keyword',
          description: 'Network exposure of the affected system.',
          validation: {
            allowed_values: ['Internet-facing', 'Internal only', 'DMZ', 'Cloud / SaaS'],
          },
        },
        {
          name: 'exploitation_confirmed',
          type: 'boolean',
          description:
            'Whether active exploitation has been confirmed in this environment (true or false).',
          value: 'false',
        },
        {
          name: 'patch_available',
          type: 'boolean',
          description: 'Whether a vendor patch is available (true or false).',
          value: 'false',
        },
        {
          name: 'post_exploitation_activity',
          type: 'text',
          description:
            'Post-exploitation activity observed (comma-separated). Options: Lateral movement, Persistence established, C2 beacon detected, Sensitive data accessed, Privilege escalation, None observed.',
        },
      ],
    },
  },
];
