/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryableErrorCodes: string[];
  retryableHttpCodes: number[];
}

interface FleetApiError {
  statusCode?: number;
  code?: string;
  message: string;
  details?: any;
  isRetryable: boolean;
  suggestedAction?: string;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBackoff: true,
  retryableErrorCodes: [
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'NETWORK_ERROR',
  ],
  retryableHttpCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Comprehensive error handling and retry service for Fleet API operations.
 * Provides consistent error classification, retry logic, and recovery strategies
 * for all Fleet-related operations in compliance monitoring.
 */
export class FleetApiErrorHandler {
  constructor(private readonly logger: Logger) {}

  /**
   * Executes a Fleet API operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customOptions: Partial<RetryOptions> = {}
  ): Promise<{
    success: boolean;
    result?: T;
    error?: FleetApiError;
    attemptsMade: number;
    totalDuration: number;
  }> {
    const options = { ...DEFAULT_RETRY_OPTIONS, ...customOptions };
    const startTime = Date.now();
    let lastError: any;
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      attemptsMade = attempt;
      
      try {
        this.logger.debug(
          `Executing ${operationName} (attempt ${attempt}/${options.maxAttempts})`
        );

        const result = await operation();
        
        const duration = Date.now() - startTime;
        if (attempt > 1) {
          this.logger.info(
            `${operationName} succeeded on attempt ${attempt} after ${duration}ms`
          );
        }

        return {
          success: true,
          result,
          attemptsMade,
          totalDuration: duration,
        };

      } catch (error) {
        lastError = error;
        const fleetError = this.classifyError(error);
        
        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${fleetError.message}`,
          { 
            statusCode: fleetError.statusCode,
            code: fleetError.code,
            isRetryable: fleetError.isRetryable,
          }
        );

        // Don't retry if error is not retryable or if this is the last attempt
        if (!fleetError.isRetryable || attempt === options.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, options);
        this.logger.debug(`Waiting ${delay}ms before retry ${attempt + 1}`);
        
        await this.sleep(delay);
      }
    }

    // All retries failed
    const finalError = this.classifyError(lastError);
    const totalDuration = Date.now() - startTime;
    
    this.logger.error(
      `${operationName} failed after ${attemptsMade} attempts in ${totalDuration}ms: ${finalError.message}`,
      { error: lastError }
    );

    return {
      success: false,
      error: finalError,
      attemptsMade,
      totalDuration,
    };
  }

  /**
   * Classifies errors to determine retry behavior and suggested actions
   */
  classifyError(error: any): FleetApiError {
    // Handle Elasticsearch/Fleet specific errors
    if (error.body?.error) {
      return this.handleFleetApiError(error);
    }

    // Handle HTTP errors
    if (error.statusCode || error.status) {
      return this.handleHttpError(error);
    }

    // Handle network/connection errors
    if (error.code) {
      return this.handleConnectionError(error);
    }

    // Handle validation errors
    if (error.message?.includes('validation')) {
      return this.handleValidationError(error);
    }

    // Generic error
    return {
      message: error.message || 'Unknown Fleet API error',
      isRetryable: false,
      suggestedAction: 'Check Fleet API configuration and connectivity',
    };
  }

  /**
   * Handles Fleet-specific API errors
   */
  private handleFleetApiError(error: any): FleetApiError {
    const body = error.body?.error || {};
    const statusCode = error.statusCode || error.status;
    const errorType = body.type || 'fleet_api_error';

    let isRetryable = false;
    let suggestedAction = 'Check Fleet API request parameters';

    switch (errorType) {
      case 'agent_policy_not_found_exception':
        suggestedAction = 'Ensure agent policy exists and is accessible';
        break;
      
      case 'package_policy_not_found_exception':
        suggestedAction = 'Ensure package policy exists and is not deleted';
        break;
      
      case 'fleet_server_unavailable':
        isRetryable = true;
        suggestedAction = 'Wait for Fleet Server to become available';
        break;
      
      case 'concurrent_modification_exception':
        isRetryable = true;
        suggestedAction = 'Retry after brief delay due to concurrent modification';
        break;
      
      case 'quota_exceeded':
        suggestedAction = 'Check Fleet licensing and usage limits';
        break;
      
      case 'invalid_package_policy':
        suggestedAction = 'Validate package policy configuration';
        break;

      default:
        if (statusCode >= 500) {
          isRetryable = true;
          suggestedAction = 'Fleet Server internal error - retry may succeed';
        }
    }

    return {
      statusCode,
      code: errorType,
      message: body.message || `Fleet API error: ${errorType}`,
      details: body.details,
      isRetryable,
      suggestedAction,
    };
  }

  /**
   * Handles HTTP errors
   */
  private handleHttpError(error: any): FleetApiError {
    const statusCode = error.statusCode || error.status;
    let isRetryable = DEFAULT_RETRY_OPTIONS.retryableHttpCodes.includes(statusCode);
    let suggestedAction = '';

    switch (statusCode) {
      case 400:
        suggestedAction = 'Check request parameters and payload format';
        break;
      case 401:
        suggestedAction = 'Check authentication credentials';
        break;
      case 403:
        suggestedAction = 'Check user permissions for Fleet operations';
        break;
      case 404:
        suggestedAction = 'Check if referenced resource exists';
        break;
      case 409:
        isRetryable = true;
        suggestedAction = 'Conflict detected - retry with updated data';
        break;
      case 429:
        isRetryable = true;
        suggestedAction = 'Rate limited - wait before retry';
        break;
      case 500:
        isRetryable = true;
        suggestedAction = 'Server error - retry may succeed';
        break;
      case 502:
      case 503:
      case 504:
        isRetryable = true;
        suggestedAction = 'Service temporarily unavailable - retry after delay';
        break;
      default:
        suggestedAction = `HTTP ${statusCode} error - check Fleet API status`;
    }

    return {
      statusCode,
      message: error.message || `HTTP ${statusCode} error`,
      isRetryable,
      suggestedAction,
    };
  }

  /**
   * Handles connection errors
   */
  private handleConnectionError(error: any): FleetApiError {
    const code = error.code;
    const isRetryable = DEFAULT_RETRY_OPTIONS.retryableErrorCodes.includes(code);
    
    let message = error.message || 'Connection error';
    let suggestedAction = '';

    switch (code) {
      case 'ECONNREFUSED':
        message = 'Connection refused - Fleet API not reachable';
        suggestedAction = 'Check Fleet Server is running and accessible';
        break;
      case 'ENOTFOUND':
        message = 'DNS lookup failed - host not found';
        suggestedAction = 'Check Fleet API hostname configuration';
        break;
      case 'ETIMEDOUT':
        message = 'Connection timeout';
        suggestedAction = 'Check network connectivity and Fleet API response time';
        break;
      case 'ECONNRESET':
        message = 'Connection reset by peer';
        suggestedAction = 'Network issue - retry may succeed';
        break;
      case 'EAI_AGAIN':
        message = 'DNS lookup timeout';
        suggestedAction = 'DNS issue - retry may succeed';
        break;
      default:
        suggestedAction = 'Check network connectivity to Fleet API';
    }

    return {
      code,
      message,
      isRetryable,
      suggestedAction,
    };
  }

  /**
   * Handles validation errors
   */
  private handleValidationError(error: any): FleetApiError {
    return {
      message: error.message || 'Validation error',
      isRetryable: false,
      suggestedAction: 'Fix validation errors in request payload',
      details: error.details || error.validation,
    };
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    if (!options.exponentialBackoff) {
      return options.baseDelay;
    }

    // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
    const exponentialDelay = options.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3; // Add up to 30% jitter
    const delayWithJitter = exponentialDelay * (1 + jitter);
    
    return Math.min(delayWithJitter, options.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a circuit breaker for Fleet API operations
   */
  createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeout: number = 60000,
    monitoringWindow: number = 300000
  ) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';
    const failures: number[] = [];

    return {
      async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
        const now = Date.now();
        
        // Remove old failures outside the monitoring window
        const recentFailures = failures.filter(time => now - time < monitoringWindow);
        failures.length = 0;
        failures.push(...recentFailures);

        switch (state) {
          case 'open':
            if (now - lastFailureTime > resetTimeout) {
              state = 'half-open';
              this.logger.info(`Circuit breaker for ${operationName} entering half-open state`);
            } else {
              throw new Error(`Circuit breaker open for ${operationName} - too many recent failures`);
            }
            break;
          
          case 'half-open':
            // Allow one request through
            break;
            
          case 'closed':
          default:
            // Normal operation
            break;
        }

        try {
          const result = await operation();
          
          // Success - reset if we were in half-open state
          if (state === 'half-open') {
            state = 'closed';
            failureCount = 0;
            failures.length = 0;
            this.logger.info(`Circuit breaker for ${operationName} reset to closed state`);
          }
          
          return result;
          
        } catch (error) {
          failures.push(now);
          failureCount++;
          lastFailureTime = now;
          
          if (failures.length >= failureThreshold) {
            state = 'open';
            this.logger.warn(
              `Circuit breaker for ${operationName} opened due to ${failures.length} failures in ${monitoringWindow}ms window`
            );
          } else if (state === 'half-open') {
            state = 'open';
            this.logger.warn(`Circuit breaker for ${operationName} reopened after half-open test failed`);
          }
          
          throw error;
        }
      },

      getState() {
        return {
          state,
          failureCount: failures.length,
          lastFailureTime,
          canExecute: state !== 'open' || Date.now() - lastFailureTime > resetTimeout,
        };
      },

      reset() {
        state = 'closed';
        failureCount = 0;
        failures.length = 0;
        lastFailureTime = 0;
        this.logger.info(`Circuit breaker manually reset`);
      },
    };
  }

  /**
   * Wraps Fleet API methods with error handling
   */
  wrapFleetApiMethod<T extends (...args: any[]) => Promise<any>>(
    method: T,
    methodName: string,
    options: Partial<RetryOptions> = {}
  ): T {
    const wrappedMethod = async (...args: Parameters<T>) => {
      const result = await this.executeWithRetry(
        () => method(...args),
        methodName,
        options
      );

      if (!result.success) {
        // Convert to standard error for consistency
        const error = new Error(result.error?.message || `${methodName} failed`);
        (error as any).fleetError = result.error;
        (error as any).attemptsMade = result.attemptsMade;
        (error as any).totalDuration = result.totalDuration;
        throw error;
      }

      return result.result;
    };

    return wrappedMethod as T;
  }

  /**
   * Creates enhanced error context for debugging
   */
  createErrorContext(
    operation: string,
    params: any,
    error: FleetApiError
  ): {
    operation: string;
    timestamp: string;
    params: any;
    error: FleetApiError;
    environment: {
      nodeVersion: string;
      platform: string;
    };
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    if (error.suggestedAction) {
      recommendations.push(error.suggestedAction);
    }

    if (error.isRetryable) {
      recommendations.push('This error is retryable - consider increasing retry attempts');
    }

    if (error.statusCode === 403) {
      recommendations.push('Check Fleet RBAC permissions for the current user');
    }

    if (error.code === 'ECONNREFUSED') {
      recommendations.push('Verify Fleet Server is running and accessible from this instance');
    }

    return {
      operation,
      timestamp: new Date().toISOString(),
      params: this.sanitizeParams(params),
      error,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
      recommendations,
    };
  }

  /**
   * Sanitizes parameters for safe logging (removes sensitive data)
   */
  private sanitizeParams(params: any): any {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = JSON.parse(JSON.stringify(params));

    function sanitizeObj(obj: any, path: string = ''): any {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeObj(item, `${path}[${index}]`));
      }
      
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          const fullPath = path ? `${path}.${key}` : key;
          
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            obj[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            obj[key] = sanitizeObj(value, fullPath);
          }
        }
      }
      
      return obj;
    }

    return sanitizeObj(sanitized);
  }
}