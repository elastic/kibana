/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type RegulatoryFramework = 'soc2' | 'iso27001' | 'pci-dss' | 'nist-800-53' | 'hipaa' | 'gdpr';

export interface RegulatoryReportTemplate {
  framework: RegulatoryFramework;
  title: string;
  description: string;
  sections: ReportSection[];
  controlMappings: ControlMapping[];
  auditRequirements: AuditRequirement[];
}

export interface ReportSection {
  id: string;
  title: string;
  description: string;
  required: boolean;
  content_type: 'summary' | 'detailed' | 'evidence' | 'attestation';
}

export interface ControlMapping {
  framework_control: string;
  control_title: string;
  cis_mappings: string[];
  compliance_rules: string[];
  evidence_requirements: string[];
}

export interface AuditRequirement {
  requirement_id: string;
  description: string;
  evidence_type: 'automated' | 'manual' | 'hybrid';
  data_sources: string[];
}

/**
 * Service providing regulatory compliance report templates
 * Maps compliance findings to regulatory framework requirements (SOC2, ISO27001, PCI-DSS, etc.)
 */
export class RegulatoryReportTemplates {
  constructor(private readonly logger: Logger) {}

  /**
   * Get template for specific regulatory framework
   */
  getTemplate(framework: RegulatoryFramework): RegulatoryReportTemplate {
    const templates: Record<RegulatoryFramework, RegulatoryReportTemplate> = {
      soc2: this.getSOC2Template(),
      iso27001: this.getISO27001Template(),
      'pci-dss': this.getPCIDSSTemplate(),
      'nist-800-53': this.getNIST80053Template(),
      hipaa: this.getHIPAATemplate(),
      gdpr: this.getGDPRTemplate(),
    };

    return templates[framework];
  }

  /**
   * SOC 2 Type II Report Template
   */
  private getSOC2Template(): RegulatoryReportTemplate {
    return {
      framework: 'soc2',
      title: 'SOC 2 Type II Compliance Report',
      description: 'System and Organization Controls 2 - Trust Services Criteria',
      sections: [
        {
          id: 'executive_summary',
          title: 'Executive Summary',
          description: 'High-level overview of security posture and compliance status',
          required: true,
          content_type: 'summary',
        },
        {
          id: 'security_criteria',
          title: 'Security (CC6)',
          description: 'Common Criteria 6 - Security controls',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'availability_criteria',
          title: 'Availability (A1)',
          description: 'Availability controls and uptime',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'confidentiality_criteria',
          title: 'Confidentiality (C1)',
          description: 'Data protection and encryption controls',
          required: false,
          content_type: 'detailed',
        },
        {
          id: 'processing_integrity',
          title: 'Processing Integrity (PI1)',
          description: 'System processing accuracy and authorization',
          required: false,
          content_type: 'detailed',
        },
        {
          id: 'privacy_criteria',
          title: 'Privacy (P1)',
          description: 'Personal information handling',
          required: false,
          content_type: 'detailed',
        },
        {
          id: 'control_evidence',
          title: 'Control Evidence',
          description: 'Automated evidence from compliance monitoring',
          required: true,
          content_type: 'evidence',
        },
        {
          id: 'exceptions_deviations',
          title: 'Exceptions and Deviations',
          description: 'Approved exceptions and compensating controls',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'management_attestation',
          title: 'Management Attestation',
          description: 'Management assertion of control effectiveness',
          required: true,
          content_type: 'attestation',
        },
      ],
      controlMappings: [
        {
          framework_control: 'CC6.1',
          control_title: 'Logical and Physical Access Controls',
          cis_mappings: ['5.1', '5.2', '5.3'],
          compliance_rules: ['cis-linux-5.1.1', 'cis-linux-5.2.1'],
          evidence_requirements: [
            'User account audit',
            'Password policy configuration',
            'Sudo configuration review',
          ],
        },
        {
          framework_control: 'CC6.6',
          control_title: 'Encryption of Data at Rest',
          cis_mappings: ['1.1.1', '1.1.2'],
          compliance_rules: ['cis-linux-1.1.1', 'cis-linux-1.1.2'],
          evidence_requirements: [
            'Disk encryption status',
            'Filesystem encryption verification',
          ],
        },
        {
          framework_control: 'CC6.7',
          control_title: 'Encryption of Data in Transit',
          cis_mappings: ['2.2', '2.3'],
          compliance_rules: ['cis-linux-2.2.1', 'cis-linux-2.3.1'],
          evidence_requirements: ['TLS configuration', 'SSH configuration'],
        },
        {
          framework_control: 'CC7.2',
          control_title: 'Detection of Security Events',
          cis_mappings: ['4.1', '4.2'],
          compliance_rules: ['cis-linux-4.1.1', 'cis-linux-4.2.1'],
          evidence_requirements: ['Audit logging enabled', 'Log retention configured'],
        },
      ],
      auditRequirements: [
        {
          requirement_id: 'SOC2-1',
          description: 'Demonstrate continuous compliance monitoring',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*', 'compliance-scores'],
        },
        {
          requirement_id: 'SOC2-2',
          description: 'Exception management and approval process',
          evidence_type: 'hybrid',
          data_sources: ['compliance-exceptions', 'compliance-approvals'],
        },
        {
          requirement_id: 'SOC2-3',
          description: 'Remediation tracking and verification',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*'],
        },
      ],
    };
  }

  /**
   * ISO 27001:2022 Report Template
   */
  private getISO27001Template(): RegulatoryReportTemplate {
    return {
      framework: 'iso27001',
      title: 'ISO/IEC 27001:2022 Compliance Report',
      description: 'Information Security Management System (ISMS) Compliance',
      sections: [
        {
          id: 'scope',
          title: 'Scope of ISMS',
          description: 'Organizational scope and boundaries',
          required: true,
          content_type: 'summary',
        },
        {
          id: 'annex_a_5',
          title: 'Annex A.5 - Organizational Controls',
          description: 'Information security policies and organization',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'annex_a_8',
          title: 'Annex A.8 - Technical Controls',
          description: 'User endpoint devices and access control',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'control_effectiveness',
          title: 'Control Effectiveness Testing',
          description: 'Evidence of control implementation and operation',
          required: true,
          content_type: 'evidence',
        },
        {
          id: 'nonconformities',
          title: 'Nonconformities and Corrective Actions',
          description: 'Failed controls and remediation plans',
          required: true,
          content_type: 'detailed',
        },
      ],
      controlMappings: [
        {
          framework_control: 'A.8.1',
          control_title: 'User Endpoint Devices',
          cis_mappings: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'],
          compliance_rules: ['cis-linux-1.*'],
          evidence_requirements: [
            'Initial system setup hardening',
            'Filesystem configuration',
            'Boot security',
          ],
        },
        {
          framework_control: 'A.8.3',
          control_title: 'Information Access Restriction',
          cis_mappings: ['5.1', '5.2', '5.3', '6.1', '6.2'],
          compliance_rules: ['cis-linux-5.*', 'cis-linux-6.*'],
          evidence_requirements: [
            'Access control configuration',
            'User privilege verification',
            'File permissions audit',
          ],
        },
        {
          framework_control: 'A.8.9',
          control_title: 'Configuration Management',
          cis_mappings: ['3.1', '3.2', '3.3'],
          compliance_rules: ['cis-linux-3.*'],
          evidence_requirements: ['Network configuration', 'Service configuration'],
        },
        {
          framework_control: 'A.8.15',
          title: 'Logging',
          cis_mappings: ['4.1', '4.2'],
          compliance_rules: ['cis-linux-4.*'],
          evidence_requirements: ['Audit logging configuration', 'Log retention'],
        },
      ],
      auditRequirements: [
        {
          requirement_id: 'ISO-CERT-1',
          description: 'Statement of Applicability (SoA) alignment',
          evidence_type: 'manual',
          data_sources: ['compliance-rules'],
        },
        {
          requirement_id: 'ISO-CERT-2',
          description: 'Control effectiveness evidence',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*'],
        },
        {
          requirement_id: 'ISO-CERT-3',
          description: 'Internal audit findings',
          evidence_type: 'hybrid',
          data_sources: ['compliance-exceptions', 'audit-logs'],
        },
      ],
    };
  }

  /**
   * PCI-DSS v4.0 Report Template
   */
  private getPCIDSSTemplate(): RegulatoryReportTemplate {
    return {
      framework: 'pci-dss',
      title: 'PCI-DSS v4.0 Compliance Report',
      description: 'Payment Card Industry Data Security Standard Compliance',
      sections: [
        {
          id: 'requirement_1',
          title: 'Requirement 1: Network Security Controls',
          description: 'Install and maintain network security controls',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'requirement_2',
          title: 'Requirement 2: Secure Configurations',
          description: 'Apply secure configurations to all system components',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'requirement_3',
          title: 'Requirement 3: Protect Stored Data',
          description: 'Protect stored account data',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'requirement_4',
          title: 'Requirement 4: Protect Cardholder Data in Transit',
          description: 'Protect cardholder data with strong cryptography during transmission',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'requirement_10',
          title: 'Requirement 10: Log and Monitor',
          description: 'Log and monitor all access to system components and cardholder data',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'compensating_controls',
          title: 'Compensating Controls',
          description: 'Alternative controls for requirements that cannot be met directly',
          required: true,
          content_type: 'detailed',
        },
      ],
      controlMappings: [
        {
          framework_control: 'PCI-DSS-2.2.1',
          control_title: 'Configuration standards are defined and implemented',
          cis_mappings: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2'],
          compliance_rules: ['cis-linux-1.*', 'cis-linux-2.*', 'cis-linux-3.*'],
          evidence_requirements: [
            'Hardening standards documented',
            'Configuration baselines applied',
            'Automated compliance checks',
          ],
        },
        {
          framework_control: 'PCI-DSS-2.2.6',
          control_title: 'System security parameters are configured to prevent misuse',
          cis_mappings: ['5.1', '5.2', '6.1', '6.2'],
          compliance_rules: ['cis-linux-5.*', 'cis-linux-6.*'],
          evidence_requirements: [
            'Access control lists',
            'User privilege verification',
            'File permission audits',
          ],
        },
        {
          framework_control: 'PCI-DSS-10.2.1',
          control_title: 'Audit logs capture all individual user access',
          cis_mappings: ['4.1.1', '4.1.2', '4.2.1'],
          compliance_rules: ['cis-linux-4.1.*', 'cis-linux-4.2.*'],
          evidence_requirements: ['Audit configuration', 'Log collection verification'],
        },
      ],
      auditRequirements: [
        {
          requirement_id: 'PCI-11.3.1',
          description: 'Internal vulnerability scans are performed',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*'],
        },
        {
          requirement_id: 'PCI-12.3.2',
          description: 'Compliance program reviewed at least annually',
          evidence_type: 'manual',
          data_sources: ['compliance-scores', 'historical-trends'],
        },
      ],
    };
  }

  /**
   * NIST 800-53 Rev. 5 Template
   */
  private getNIST80053Template(): RegulatoryReportTemplate {
    return {
      framework: 'nist-800-53',
      title: 'NIST 800-53 Rev. 5 Security Controls Report',
      description: 'Security and Privacy Controls for Information Systems and Organizations',
      sections: [
        {
          id: 'ac_access_control',
          title: 'AC - Access Control',
          description: 'Access control policies and enforcement',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'au_audit',
          title: 'AU - Audit and Accountability',
          description: 'Audit logging and monitoring',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'cm_configuration',
          title: 'CM - Configuration Management',
          description: 'Baseline configurations and change control',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'ia_identification',
          title: 'IA - Identification and Authentication',
          description: 'User identification and authentication mechanisms',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'sc_system_communications',
          title: 'SC - System and Communications Protection',
          description: 'Boundary protection and cryptography',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'si_system_information_integrity',
          title: 'SI - System and Information Integrity',
          description: 'Flaw remediation and malicious code protection',
          required: true,
          content_type: 'detailed',
        },
      ],
      controlMappings: [
        {
          framework_control: 'AC-2',
          control_title: 'Account Management',
          cis_mappings: ['5.1', '5.2'],
          compliance_rules: ['cis-linux-5.1.*', 'cis-linux-5.2.*'],
          evidence_requirements: ['User account listing', 'Privilege verification'],
        },
        {
          framework_control: 'AU-2',
          control_title: 'Event Logging',
          cis_mappings: ['4.1.1', '4.1.2'],
          compliance_rules: ['cis-linux-4.1.*'],
          evidence_requirements: ['Audit daemon configuration', 'Log collection verification'],
        },
        {
          framework_control: 'CM-6',
          control_title: 'Configuration Settings',
          cis_mappings: ['1.*', '2.*', '3.*'],
          compliance_rules: ['cis-linux-1.*', 'cis-linux-2.*', 'cis-linux-3.*'],
          evidence_requirements: ['Configuration baselines', 'Hardening verification'],
        },
        {
          framework_control: 'IA-2',
          control_title: 'Identification and Authentication',
          cis_mappings: ['5.3', '6.1'],
          compliance_rules: ['cis-linux-5.3.*', 'cis-linux-6.1.*'],
          evidence_requirements: ['Password policy', 'Authentication configuration'],
        },
      ],
      auditRequirements: [
        {
          requirement_id: 'NIST-CA-2',
          description: 'Control Assessments',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*', 'compliance-scores'],
        },
        {
          requirement_id: 'NIST-CA-7',
          description: 'Continuous Monitoring',
          evidence_type: 'automated',
          data_sources: ['compliance-findings-*', 'transform-metrics'],
        },
      ],
    };
  }

  /**
   * HIPAA Security Rule Template
   */
  private getHIPAATemplate(): RegulatoryReportTemplate {
    return {
      framework: 'hipaa',
      title: 'HIPAA Security Rule Compliance Report',
      description: 'Health Insurance Portability and Accountability Act - Security Standards',
      sections: [
        {
          id: 'administrative_safeguards',
          title: 'Administrative Safeguards',
          description: 'Security management process and workforce security',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'physical_safeguards',
          title: 'Physical Safeguards',
          description: 'Facility access controls and workstation security',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'technical_safeguards',
          title: 'Technical Safeguards',
          description: 'Access control, audit controls, integrity, and transmission security',
          required: true,
          content_type: 'detailed',
        },
      ],
      controlMappings: [
        {
          framework_control: '164.312(a)(1)',
          control_title: 'Access Control',
          cis_mappings: ['5.1', '5.2', '5.3'],
          compliance_rules: ['cis-linux-5.*'],
          evidence_requirements: ['User access controls', 'Authentication mechanisms'],
        },
        {
          framework_control: '164.312(b)',
          control_title: 'Audit Controls',
          cis_mappings: ['4.1', '4.2'],
          compliance_rules: ['cis-linux-4.*'],
          evidence_requirements: ['Audit logging', 'Activity monitoring'],
        },
        {
          framework_control: '164.312(e)(1)',
          control_title: 'Transmission Security',
          cis_mappings: ['2.2', '2.3', '3.1'],
          compliance_rules: ['cis-linux-2.2.*', 'cis-linux-3.1.*'],
          evidence_requirements: ['Encryption in transit', 'Network security'],
        },
      ],
      auditRequirements: [],
    };
  }

  /**
   * GDPR Technical Measures Template
   */
  private getGDPRTemplate(): RegulatoryReportTemplate {
    return {
      framework: 'gdpr',
      title: 'GDPR Article 32 Technical Measures Report',
      description: 'Security of Processing - Technical and Organizational Measures',
      sections: [
        {
          id: 'art32_encryption',
          title: 'Encryption of Personal Data',
          description: 'Pseudonymization and encryption measures',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'art32_integrity',
          title: 'System Integrity and Resilience',
          description: 'Ongoing confidentiality, integrity, availability',
          required: true,
          content_type: 'detailed',
        },
        {
          id: 'art32_testing',
          title: 'Testing and Assessment',
          description: 'Regular testing of technical measures',
          required: true,
          content_type: 'evidence',
        },
      ],
      controlMappings: [
        {
          framework_control: 'GDPR-32(1)(a)',
          control_title: 'Pseudonymization and encryption',
          cis_mappings: ['1.1.1', '1.1.2'],
          compliance_rules: ['cis-linux-1.1.*'],
          evidence_requirements: ['Encryption verification'],
        },
      ],
      auditRequirements: [],
    };
  }

  /**
   * Generate regulatory report from template
   */
  async generateRegulatoryReport(
    framework: RegulatoryFramework,
    complianceData: any
  ): Promise<{
    template: RegulatoryReportTemplate;
    populated_sections: Array<{
      section_id: string;
      title: string;
      content: string;
      compliance_percentage: number;
      findings_count: number;
    }>;
    control_status: Array<{
      control: string;
      status: 'compliant' | 'non-compliant' | 'partial';
      evidence: string[];
    }>;
  }> {
    const template = this.getTemplate(framework);

    this.logger.info(`Generating ${framework.toUpperCase()} regulatory report`);

    const populatedSections = template.sections.map((section) => ({
      section_id: section.id,
      title: section.title,
      content: this.generateSectionContent(section, complianceData),
      compliance_percentage: this.calculateSectionCompliance(section, complianceData),
      findings_count: this.countSectionFindings(section, complianceData),
    }));

    const controlStatus = template.controlMappings.map((mapping) => ({
      control: mapping.framework_control,
      status: this.determineControlStatus(mapping, complianceData),
      evidence: this.collectControlEvidence(mapping, complianceData),
    }));

    return {
      template,
      populated_sections: populatedSections,
      control_status: controlStatus,
    };
  }

  /**
   * List all available regulatory templates
   */
  listAvailableTemplates(): Array<{
    framework: RegulatoryFramework;
    title: string;
    description: string;
  }> {
    return [
      {
        framework: 'soc2',
        title: 'SOC 2 Type II',
        description: 'Service Organization Control 2 - Trust Services Criteria',
      },
      {
        framework: 'iso27001',
        title: 'ISO/IEC 27001:2022',
        description: 'Information Security Management System',
      },
      {
        framework: 'pci-dss',
        title: 'PCI-DSS v4.0',
        description: 'Payment Card Industry Data Security Standard',
      },
      {
        framework: 'nist-800-53',
        title: 'NIST 800-53 Rev. 5',
        description: 'Security and Privacy Controls',
      },
      {
        framework: 'hipaa',
        title: 'HIPAA Security Rule',
        description: 'Health Insurance Portability and Accountability Act',
      },
      {
        framework: 'gdpr',
        title: 'GDPR Article 32',
        description: 'Security of Processing',
      },
    ];
  }

  // Helper methods (placeholders for full implementation)
  private generateSectionContent(section: ReportSection, data: any): string {
    return `Content for ${section.title} based on compliance data`;
  }

  private calculateSectionCompliance(section: ReportSection, data: any): number {
    return 85; // Placeholder
  }

  private countSectionFindings(section: ReportSection, data: any): number {
    return 0; // Placeholder
  }

  private determineControlStatus(
    mapping: ControlMapping,
    data: any
  ): 'compliant' | 'non-compliant' | 'partial' {
    return 'compliant'; // Placeholder
  }

  private collectControlEvidence(mapping: ControlMapping, data: any): string[] {
    return mapping.evidence_requirements;
  }
}
