/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UserIdAndName {
  /** profile UUID */
  id?: string;
  /** username */
  username: string;
}

/**
 * Identity used in authorization decisions. Adds the user's Kibana role names so ACL
 * role grants (`type: 'role'`) can be matched against the current request.
 */
export interface CurrentUser extends UserIdAndName {
  /** Kibana role names assigned to this user. */
  roles?: string[];
}
