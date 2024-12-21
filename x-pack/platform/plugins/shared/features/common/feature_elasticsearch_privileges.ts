/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Elasticsearch Feature privilege definition
 */
export interface FeatureElasticsearchPrivileges {
  /**
   * A set of Elasticsearch cluster privileges which are required for this feature to be enabled.
   * See https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html
   *
   */
  requiredClusterPrivileges: string[];

  /**
   * A set of Elasticsearch index privileges which are required for this feature to be enabled, keyed on index name or pattern.
   * See https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html#privileges-list-indices
   *
   * @example
   *
   * Requiring `read` access to `logstash-*` and `all` access to `foo-*`
   * ```ts
   * feature.registerElasticsearchPrivilege({
   *   privileges: [{
   *     requiredIndexPrivileges: {
   *       ['logstash-*']: ['read'],
   *       ['foo-*]: ['all']
   *     }
   *   }]
   * })
   * ```
   *
   */
  requiredIndexPrivileges?: {
    [indexName: string]: string[];
  };

  /**
   * A set of Elasticsearch roles which are required for this feature to be enabled.
   *
   * @deprecated do not rely on hard-coded role names.
   * @removeBy 8.8.0
   *
   * This is relied on by the reporting feature, and should be removed once reporting
   * migrates to using the Kibana Privilege model: https://github.com/elastic/kibana/issues/19914
   */
  requiredRoles?: string[];

  /**
   * A list of UI Capabilities that should be granted to users with this privilege.
   * These capabilities will automatically be namespaces within your feature id.
   *
   * @example
   * ```ts
   *  {
   *    ui: ['show', 'save']
   *  }
   *
   *  This translates in the UI to the following (assuming a feature id of "foo"):
   *  import { uiCapabilities } from 'ui/capabilities';
   *
   *  const canShowApp = uiCapabilities.foo.show;
   *  const canSave = uiCapabilities.foo.save;
   * ```
   * Note: Since these are automatically namespaced, you are free to use generic names like "show" and "save".
   *
   * @see UICapabilities
   */
  ui: string[];
}
