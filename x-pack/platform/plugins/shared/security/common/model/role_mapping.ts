/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RoleMappingAnyRule {
  any: RoleMappingRule[];
}

export interface RoleMappingAllRule {
  all: RoleMappingRule[];
}

export interface RoleMappingFieldRule {
  field: Record<string, any>;
}

export interface RoleMappingExceptRule {
  except: RoleMappingRule;
}

export type RoleMappingRule =
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
