/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface RoleMappingAnyRule {
  any: RoleMappingRule[];
}

interface RoleMappingAllRule {
  all: RoleMappingRule[];
}

interface RoleMappingFieldRule {
  field: Record<string, any>;
}

interface RoleMappingExceptRule {
  except: RoleMappingRule;
}

type RoleMappingRule =
  | RoleMappingAnyRule
  | RoleMappingAllRule
  | RoleMappingFieldRule
  | RoleMappingExceptRule;

type RoleTemplateFormat = 'string' | 'json';

export interface InlineRoleTemplate {
  template: { source: string };
  format?: RoleTemplateFormat;
}

export interface StoredRoleTemplate {
  template: { id: string };
  format?: RoleTemplateFormat;
}

export interface InvalidRoleTemplate {
  template: string;
  format?: RoleTemplateFormat;
}

export type RoleTemplate = InlineRoleTemplate | StoredRoleTemplate | InvalidRoleTemplate;

export interface RoleMapping {
  name: string;
  enabled: boolean;
  roles?: string[];
  role_templates?: RoleTemplate[];
  rules: RoleMappingRule | {};
  metadata: Record<string, any>;
}
