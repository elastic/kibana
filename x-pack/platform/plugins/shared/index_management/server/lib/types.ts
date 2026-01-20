/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MeteringStats {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}
export interface UserStartPrivilegesResponse {
  privileges: {
    canManageIndex: boolean;
  };
}
