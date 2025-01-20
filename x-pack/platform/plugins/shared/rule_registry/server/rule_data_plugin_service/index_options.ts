/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ValidFeatureId } from '@kbn/rule-data-utils';

/**
 * Options that a plugin/solution provides to rule_registry in order to
 * define and initialize an index for alerts-as-data.
 *
 * IMPORTANT: All names provided in these options are relative. For example:
 * - component template refs will be 'ecs-mappings', not '.alerts-ecs-mappings'
 * - component template names will be 'mappings', not '.alerts-security.alerts-mappings'
 * - etc
 */
export interface IndexOptions {
  /**
   * ID of the Kibana feature associated with the index.
   * Used by alerts-as-data RBAC.
   *
   * Note from @dhurley14
   * The purpose of the `feature` param is to force the user to update
   * the data structure which contains the mapping of consumers to alerts
   * as data indices. The idea is it is typed such that it forces the
   * user to go to the code and modify it. At least until a better system
   * is put in place or we move the alerts as data client out of rule registry.
   *
   * @example 'siem', 'logs', 'apm'
   */
  feature: ValidFeatureId;

  /**
   * Registration context which defines a solution or an app within a solution.
   * @example 'security', 'observability', 'observability.logs'
   */
  registrationContext: string;

  /**
   * Dataset suffix. Restricted to a few values.
   * @example 'alerts', 'events'
   */
  dataset: Dataset;

  /**
   * A list of references to external component templates. Those can be
   * the common ones shared between all solutions, or special ones
   * shared between some of them.
   *
   * IMPORTANT: These names should be relative.
   * - correct: 'my-mappings'
   * - incorrect: '.alerts-my-mappings'
   *
   * @example ['ecs-mappings']
   */
  componentTemplateRefs: string[];

  /**
   * Own component templates specified for the index by the plugin/solution
   * defining this index.
   *
   * IMPORTANT: Order matters. This order is used by Elasticsearch to set
   * priorities when merging the same field names defined in 2+ templates.
   *
   * IMPORTANT: Component template names should be relative.
   * - correct: 'mappings'
   * - incorrect: 'security.alerts-mappings'
   * - incorrect: '.alerts-security.alerts-mappings'
   */
  componentTemplates: ComponentTemplateOptions[];

  /**
   * Additional properties for the namespaced index template.
   */
  indexTemplate?: IndexTemplateOptions;

  /**
   * Optional custom ILM policy for the index.
   * NOTE: this policy will be shared between all namespaces of the index.
   */
  ilmPolicy?: IlmPolicyOptions;

  /**
   * Optional secondary alias that will be applied to concrete indices in
   * addition to the primary one '.alerts-{reg. context}.{dataset}-{namespace}'
   *
   * IMPORTANT: It should not include the namespace. It will be added
   * automatically.
   * - correct: '.siem-signals'
   * - incorrect: '.siem-signals-default'
   *
   * @example '.siem-signals', undefined
   */
  secondaryAlias?: string;

  /**
   * Optional prefix name that will be prepended to indices in addition to
   * primary dataset and context naming convention.
   *
   * Currently used only for creating a preview index for the purpose of
   * previewing alerts from a rule. The documents are identical to alerts, but
   * shouldn't exist on an alert index and shouldn't be queried together with
   * real alerts in any way, because the rule that created them doesn't exist
   */
  additionalPrefix?: string;
}

/**
 * Dataset suffix restricted to a few values. All alerts-as-data indices
 * are designed to contain only documents of these "kinds".
 */
export enum Dataset {
  alerts = 'alerts',
  events = 'events',
}

export type Settings = estypes.IndicesIndexSettings;
export type Mappings = estypes.MappingTypeMapping;
export type Version = estypes.VersionNumber;
export type Meta = estypes.Metadata;

/**
 * When initializing an index, a plugin/solution can break mappings and settings
 * down into several component templates. Some of their properties can be
 * defined by the plugin/solution via these options.
 *
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-component-template.html
 */
export interface ComponentTemplateOptions {
  name: string;
  mappings?: Mappings;
  settings?: Settings;
  _meta?: Meta;
}

/**
 * When initializing an index, a plugin/solution can provide some optional
 * properties which will be included into the index template.
 *
 * Note that:
 * - each index namespace will get its own index template
 * - the template will be created by the library
 * - most of its properties will be set by the library
 * - you can inject some of them via these options
 *
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-template.html
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
 */
export interface IndexTemplateOptions {
  _meta?: Meta;
}

/**
 * When initializing an index, a plugin/solution can provide a custom
 * ILM policy that will be applied to concrete indices of this index.
 *
 * Note that policy will be shared between all namespaces of the index.
 */
export type IlmPolicyOptions = Omit<estypes.IlmPolicy, 'name'>;
