/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';

/**
 * Project types drive UI lens, default knowledge sources, and connector surfacing.
 */
export enum ProjectType {
  case = 'case',
  hunt = 'hunt',
  investigation = 'investigation',
  general = 'general',
}

/**
 * Reference to a Cases plugin case when `type` is `case`.
 */
export interface CaseRef {
  case_id: string;
  owner: string;
}

/**
 * Agent Builder workspace: persistent context container with conversations and knowledge.
 */
export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  case_ref?: CaseRef;
  /** Profile UIDs or usernames with access; mirrors case assignees for case projects. */
  members: string[];
  conversation_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: UserIdAndName;
  space: string;
}

export interface ProjectCreateRequest {
  id?: string;
  title: string;
  type: ProjectType;
  case_ref?: CaseRef;
  members?: string[];
  conversation_ids?: string[];
}

export interface ProjectUpdateRequest {
  id: string;
  title?: string;
  members?: string[];
  conversation_ids?: string[];
}

export interface CreateProjectFromCaseRequest {
  case_id: string;
  owner: string;
  title?: string;
}
