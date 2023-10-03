/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for the Histogram type used by computeChi2PValue.
 */
export interface Histogram {
  /**
   * The doc count.
   */
  doc_count: number;
  /**
   * The key.
   */
  key: string | number;
  /**
   * Optional percentage.
   */
  percentage?: number;
}
