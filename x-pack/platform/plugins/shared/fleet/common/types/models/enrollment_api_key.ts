/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// SO definition for this type is declared in server/types/interfaces
export interface EnrollmentAPIKey {
  id: string;
  api_key_id: string;
  api_key: string;
  name?: string;
  active: boolean;
  policy_id?: string;
  created_at: string;
}

// Generated

/**
 * An Elastic Agent enrollment API key
 */
export interface FleetServerEnrollmentAPIKey {
  /**
   * True when the key is active
   */
  active?: boolean;
  /**
   * The unique identifier for the enrollment key, currently xid
   */
  api_key_id: string;
  /**
   * Api key
   */
  api_key: string;
  /**
   * Enrollment key name
   */
  name?: string;
  policy_id?: string;
  expire_at?: string;
  created_at?: string;
  updated_at?: string;
  namespaces?: string[];
}
