/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UserActions {
  action: string;
  action_field: string[];
  action_at: string;
  action_by: { email: string; username: string; full_name: string };
  new_value: string | null;
  old_value: string | null;
  owner: string;
}

export interface UserActionVersion800 {
  action?: string;
  action_field?: string[];
  new_value?: string | null;
  old_value?: string | null;
}
