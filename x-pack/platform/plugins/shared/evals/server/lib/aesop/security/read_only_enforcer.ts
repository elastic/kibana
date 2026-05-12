/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

/**
 * AESOP Read-Only Enforcer - Production Security
 *
 * Ensures all Elasticsearch operations during AESOP exploration are read-only.
 * Prevents accidental or malicious data modification during autonomous skill discovery.
 *
 * From paper Section 8: Threat Model - prevent write operations during exploration
 */

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ReadOnlyEnforcer {
  /**
   * Validates that an Elasticsearch request is read-only (no writes, deletes, updates)
   *
   * Allowed operations:
   * - GET requests (all paths)
   * - POST /_search, /_count, /_async_search (read-only queries)
   * - POST /_field_caps (field capabilities)
   * - GET /_mapping, /_cat/* (metadata queries)
   *
   * Blocked operations:
   * - POST /_create, /_update, /_delete, /_bulk (write operations)
   * - PUT /* (index creation, document updates)
   * - DELETE /* (deletions)
   * - PATCH /* (updates)
   */
  validateReadOnlyRequest(method: string, path: string): void {
    const normalizedMethod = method.toUpperCase();
    const normalizedPath = path.toLowerCase();

    // Allow all GET requests (read-only by definition)
    if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
      return;
    }

    // Blocked: All PUT, DELETE, PATCH are write operations
    const writeOperations = ['PUT', 'DELETE', 'PATCH'];
    if (writeOperations.includes(normalizedMethod)) {
      throw new SecurityError(
        `${normalizedMethod} operations are not allowed during exploration. Only read operations permitted.`
      );
    }

    // POST: Only allow specific read-only endpoints
    if (normalizedMethod === 'POST') {
      // Allowed read-only POST endpoints
      const allowedReadOnlyPaths = [
        '/_search', // Search queries
        '/_async_search', // Async search
        '/_count', // Count queries
        '/_field_caps', // Field capabilities
        '/_msearch', // Multi-search
        '/_render/template', // Template rendering (read-only)
        '/_validate/query', // Query validation
      ];

      const isAllowedReadOnly = allowedReadOnlyPaths.some((allowed) =>
        normalizedPath.includes(allowed)
      );

      if (isAllowedReadOnly) {
        return;
      }

      // Blocked write paths (explicit deny list)
      const blockedWritePaths = [
        '/_create',
        '/_update',
        '/_delete',
        '/_bulk',
        '/_delete_by_query',
        '/_update_by_query',
        '/_reindex',
        '/_refresh',
        '/_flush',
        '/_forcemerge',
        '/_close',
        '/_open',
        '/_freeze',
        '/_unfreeze',
        '/_rollover',
        '/_shrink',
        '/_split',
      ];

      const isBlockedWrite = blockedWritePaths.some((blocked) => normalizedPath.includes(blocked));

      if (isBlockedWrite) {
        throw new SecurityError(
          `POST to ${path} not allowed (write operation). Only read operations like /_search, /_count permitted during exploration.`
        );
      }

      // If it's a POST to an index endpoint without explicit read-only suffix, block it
      // Example: POST /my-index/_doc/123 (document creation) should be blocked
      if (normalizedPath.includes('/_doc/') || normalizedPath.match(/\/[^/]+\/_doc$/)) {
        throw new SecurityError(
          `POST to ${path} not allowed (document creation/update). Only read operations permitted during exploration.`
        );
      }

      // Default deny for unrecognized POST paths
      throw new SecurityError(
        `POST to ${path} not explicitly allowed. Only read operations like /_search, /_count permitted during exploration.`
      );
    }

    // Fallback: Block any unrecognized HTTP method
    throw new SecurityError(
      `HTTP method ${method} not allowed. Only GET and specific read-only POST operations permitted.`
    );
  }

  /**
   * Validates a batch of Elasticsearch requests
   */
  validateReadOnlyRequests(requests: Array<{ method: string; path: string }>): void {
    for (const req of requests) {
      this.validateReadOnlyRequest(req.method, req.path);
    }
  }

  /**
   * Wraps an Elasticsearch client to enforce read-only operations
   * Returns a proxy that intercepts and validates all requests
   */
  wrapElasticsearchClient<T extends object>(client: T): T {
    const enforcer = this;

    return new Proxy(client, {
      get(target, prop) {
        const value = Reflect.get(target, prop);

        // If it's a function, wrap it with validation
        if (typeof value === 'function') {
          return function (...args: unknown[]) {
            // Extract method and path from first argument (typical ES client pattern)
            if (args[0] && typeof args[0] === 'object') {
              const params = args[0] as { method?: string; path?: string };
              if (params.method && params.path) {
                enforcer.validateReadOnlyRequest(params.method, params.path);
              }
            }

            // Call original function
            return value.apply(target, args);
          };
        }

        return value;
      },
    });
  }
}
