/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryElasticsearch, RegistryPolicyTemplate, RegistryVarsEntry } from './epm';

// Based on https://github.com/elastic/package-spec/blob/master/versions/1/manifest.spec.yml#L8
export interface PackageSpecManifest {
  format_version?: string;
  name: string;
  title: string;
  description?: string;
  version: string;
  license?: 'basic';
  source?: {
    license: string;
  };
  type?: PackageSpecPackageType;
  release?: 'experimental' | 'beta' | 'ga';
  categories?: Array<PackageSpecCategory | undefined>;
  conditions?: PackageSpecConditions;
  icons?: PackageSpecIcon[];
  screenshots?: PackageSpecScreenshot[];
  policy_templates_behavior?: 'all' | 'combined_policy' | 'individual_policies';
  policy_templates?: RegistryPolicyTemplate[];
  vars?: RegistryVarsEntry[];
  owner: { github?: string; type?: 'elastic' | 'partner' | 'community' };
  elasticsearch?: Pick<
    RegistryElasticsearch,
    'index_template.settings' | 'index_template.mappings' | 'index_template.data_stream'
  >;
  agent?: {
    privileges?: { root?: boolean };
  };
  asset_tags?: PackageSpecTags[];
  discovery?: {
    fields?: Array<{
      name: string;
    }>;
  };
}
export interface PackageSpecTags {
  text: string;
  asset_types?: string[];
  asset_ids?: string[];
}

export type PackageSpecPackageType = 'integration' | 'input' | 'content';

export type PackageSpecCategory =
  | 'advanced_analytics_ueba'
  | 'analytics_engine'
  | 'application_observability'
  | 'app_search'
  | 'auditd'
  | 'authentication'
  | 'aws'
  | 'azure'
  | 'big_data'
  | 'cdn_security'
  | 'cloud'
  | 'config_management'
  | 'connector'
  | 'connector_client'
  | 'containers'
  | 'crawler'
  | 'credential_management'
  | 'crm'
  | 'custom'
  | 'custom_logs'
  | 'database_security'
  | 'datastore'
  | 'dns_security'
  | 'edr_xdr'
  | 'cloudsecurity_cdr'
  | 'elasticsearch_sdk'
  | 'elastic_stack'
  | 'email_security'
  | 'enterprise_search'
  | 'firewall_security'
  | 'google_cloud'
  | 'iam'
  | 'ids_ips'
  | 'infrastructure'
  | 'java_observability'
  | 'kubernetes'
  | 'language_client'
  | 'languages'
  | 'load_balancer'
  | 'message_queue'
  | 'monitoring'
  | 'native_search'
  | 'network'
  | 'network_security'
  | 'notification'
  | 'observability'
  | 'os_system'
  | 'process_manager'
  | 'productivity'
  | 'productivity_security'
  | 'proxy_security'
  | 'sdk_search'
  | 'security'
  | 'stream_processing'
  | 'support'
  | 'threat_intel'
  | 'ticketing'
  | 'version_control'
  | 'virtualization'
  | 'vpn_security'
  | 'vulnerability_management'
  | 'web'
  | 'web_application_firewall'
  | 'websphere'
  | 'workplace_search'
  | 'workplace_search_content_source';

export interface PackageSpecConditions {
  kibana?: {
    version?: string;
  };
  elastic?: {
    subscription?: string;
    capabilities?: string[];
  };
}

export interface PackageSpecIcon {
  src: string;
  title?: string;
  size?: string;
  type?: string;
  dark_mode?: boolean;
}

export interface PackageSpecScreenshot {
  src: string;
  title: string;
  size?: string;
  type?: string;
  path?: string;
}
