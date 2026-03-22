/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { KueryNode } from '@kbn/es-query';
import { COMPLIANCE_EXCEPTION_SO_TYPE } from '../../../common/compliance';

interface ComplianceException {
  exception_id: string;
  name: string;
  description?: string;
  scope: ExceptionScope;
  rule_criteria?: RuleCriteria;
  host_criteria?: HostCriteria;
  time_scope?: TimeScope;
  approval: ApprovalInfo;
  audit: AuditInfo;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  enabled: boolean;
  priority: number;
  impact?: ImpactInfo;
  integration?: IntegrationInfo;
  comments?: CommentInfo[];
}

interface ExceptionScope {
  type: 'global' | 'benchmark' | 'rule' | 'host';
  target_id?: string;
  target_name?: string;
  additional_filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'regex';
    value: string;
  }>;
}

interface RuleCriteria {
  rule_ids?: string[];
  benchmark_ids?: string[];
  sections?: string[];
  levels?: number[];
  platforms?: string[];
  tags?: string[];
  frameworks?: Array<{ id: string; controls: string[] }>;
}

interface HostCriteria {
  host_ids?: string[];
  host_names?: string[];
  os_families?: string[];
  os_versions?: string[];
  agent_versions?: string[];
  tags?: string[];
  groups?: string[];
}

interface TimeScope {
  type: 'permanent' | 'temporary' | 'scheduled';
  start_date?: string;
  end_date?: string;
  expiration_date?: string;
  timezone?: string;
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    schedule?: string;
  };
}

interface ApprovalInfo {
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  approval_reason?: string;
  approval_conditions?: string;
  risk_assessment?: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    business_justification: string;
    compensating_controls?: string;
    review_required: boolean;
    next_review_date?: string;
  };
}

interface AuditInfo {
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  version: number;
  change_history: Array<{
    version: number;
    changed_by: string;
    changed_at: string;
    change_type: 'created' | 'updated' | 'approved' | 'expired' | 'revoked';
    change_description: string;
    previous_values?: any;
  }>;
}

interface ImpactInfo {
  affected_hosts?: number;
  affected_rules?: number;
  findings_suppressed?: number;
  last_suppression_date?: string;
  suppression_rate?: number;
  effectiveness?: {
    false_positive_reduction: number;
    operational_impact: 'low' | 'medium' | 'high';
    security_risk_increase: 'none' | 'low' | 'medium' | 'high';
  };
}

interface IntegrationInfo {
  source: 'ui' | 'api' | 'automated' | 'imported';
  source_system?: string;
  correlation_id?: string;
  tags?: string[];
  categories?: string[];
}

interface CommentInfo {
  id: string;
  author: string;
  created_at: string;
  content: string;
  type: 'note' | 'justification' | 'review' | 'escalation';
}

interface ExceptionMatchCriteria {
  ruleId?: string;
  benchmarkId?: string;
  hostId?: string;
  platform?: string;
  timestamp?: string;
  additionalContext?: Record<string, any>;
}

interface ExceptionConflictResolution {
  conflictDetected: boolean;
  winningException?: ComplianceException;
  conflictingExceptions: ComplianceException[];
  resolutionReason: string;
  resolutionStrategy: 'priority' | 'specificity' | 'temporal' | 'manual';
}

/**
 * Service for managing compliance exceptions with hierarchical scoping,
 * approval workflows, audit trails, and conflict resolution.
 */
export class ExceptionManagementService {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Creates a new compliance exception with audit trail
   */
  async createException(
    exceptionData: Omit<ComplianceException, 'exception_id' | 'audit' | 'status'> & {
      created_by: string;
    }
  ): Promise<{
    success: boolean;
    exception?: SavedObject<ComplianceException>;
    error?: string;
  }> {
    try {
      const exceptionId = uuidv4();
      const now = new Date().toISOString();

      const exception: ComplianceException = {
        ...exceptionData,
        exception_id: exceptionId,
        status: exceptionData.approval.status === 'approved' ? 'active' : 'pending',
        audit: {
          created_by: exceptionData.created_by,
          created_at: now,
          updated_at: now,
          version: 1,
          change_history: [
            {
              version: 1,
              changed_by: exceptionData.created_by,
              changed_at: now,
              change_type: 'created',
              change_description: `Exception created: ${exceptionData.name}`,
            },
          ],
        },
      };

      // Validate exception configuration
      const validation = this.validateException(exception);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Check for conflicts with existing exceptions
      const conflictCheck = await this.checkExceptionConflicts(exception);
      if (conflictCheck.conflictDetected && conflictCheck.conflictingExceptions.length > 0) {
        this.logger.warn(
          `Creating exception with conflicts: ${conflictCheck.conflictingExceptions.length} conflicting exceptions found`
        );
        // Add conflict information to audit trail
        exception.audit.change_history.push({
          version: 1,
          changed_by: exceptionData.created_by,
          changed_at: now,
          change_type: 'created',
          change_description: `Created with ${conflictCheck.conflictingExceptions.length} conflicts (resolution: ${conflictCheck.resolutionStrategy})`,
        });
      }

      const savedObject = await this.soClient.create<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exception,
        {
          id: exceptionId,
          refresh: 'wait_for',
        }
      );

      this.logger.info(`Created compliance exception: ${exceptionId}`);

      return {
        success: true,
        exception: savedObject,
      };

    } catch (error) {
      this.logger.error('Failed to create exception:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates an existing exception with audit tracking
   */
  async updateException(
    exceptionId: string,
    updates: Partial<Omit<ComplianceException, 'exception_id' | 'audit'>>,
    updatedBy: string
  ): Promise<{
    success: boolean;
    exception?: SavedObject<ComplianceException>;
    error?: string;
  }> {
    try {
      const existingException = await this.soClient.get<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId
      );

      const now = new Date().toISOString();
      const newVersion = existingException.attributes.audit.version + 1;

      // Create change description
      const changedFields = Object.keys(updates);
      const changeDescription = `Updated fields: ${changedFields.join(', ')}`;

      const updatedException: ComplianceException = {
        ...existingException.attributes,
        ...updates,
        audit: {
          ...existingException.attributes.audit,
          updated_by: updatedBy,
          updated_at: now,
          version: newVersion,
          change_history: [
            ...existingException.attributes.audit.change_history,
            {
              version: newVersion,
              changed_by: updatedBy,
              changed_at: now,
              change_type: 'updated',
              change_description: changeDescription,
              previous_values: this.extractChangedValues(existingException.attributes, updates),
            },
          ],
        },
      };

      // Validate updated exception
      const validation = this.validateException(updatedException);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      const savedObject = await this.soClient.update<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId,
        updatedException,
        {
          version: existingException.version,
          refresh: 'wait_for',
        }
      );

      this.logger.info(`Updated compliance exception: ${exceptionId}`);

      return {
        success: true,
        exception: savedObject,
      };

    } catch (error) {
      this.logger.error(`Failed to update exception ${exceptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Approves or rejects an exception
   */
  async processApproval(
    exceptionId: string,
    approval: {
      status: 'approved' | 'rejected';
      approver_id: string;
      approver_name: string;
      approval_reason?: string;
      risk_assessment?: ApprovalInfo['risk_assessment'];
    }
  ): Promise<{
    success: boolean;
    exception?: SavedObject<ComplianceException>;
    error?: string;
  }> {
    try {
      const existingException = await this.soClient.get<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId
      );

      const now = new Date().toISOString();
      const newVersion = existingException.attributes.audit.version + 1;

      const updatedException: ComplianceException = {
        ...existingException.attributes,
        approval: {
          ...existingException.attributes.approval,
          ...approval,
          approved_at: now,
        },
        status: approval.status === 'approved' ? 'active' : 'pending',
        audit: {
          ...existingException.attributes.audit,
          updated_by: approval.approver_id,
          updated_at: now,
          version: newVersion,
          change_history: [
            ...existingException.attributes.audit.change_history,
            {
              version: newVersion,
              changed_by: approval.approver_id,
              changed_at: now,
              change_type: 'approved',
              change_description: `Exception ${approval.status} by ${approval.approver_name}${approval.approval_reason ? `: ${approval.approval_reason}` : ''}`,
            },
          ],
        },
      };

      const savedObject = await this.soClient.update<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId,
        updatedException,
        {
          version: existingException.version,
          refresh: 'wait_for',
        }
      );

      this.logger.info(`Processed approval for exception ${exceptionId}: ${approval.status}`);

      return {
        success: true,
        exception: savedObject,
      };

    } catch (error) {
      this.logger.error(`Failed to process approval for exception ${exceptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Finds exceptions that apply to given criteria
   */
  async findMatchingExceptions(criteria: ExceptionMatchCriteria): Promise<{
    exceptions: ComplianceException[];
    conflicts: ExceptionConflictResolution[];
  }> {
    try {
      // Build query based on criteria
      const query = this.buildExceptionQuery(criteria);
      
      const searchResult = await this.soClient.find<ComplianceException>({
        type: COMPLIANCE_EXCEPTION_SO_TYPE,
        filter: query,
        perPage: 1000, // High limit for conflict detection
        sortField: 'audit.created_at',
        sortOrder: 'desc',
      });

      const activeExceptions = searchResult.saved_objects
        .map(so => so.attributes)
        .filter(exception => 
          exception.status === 'active' && 
          exception.enabled &&
          this.isExceptionCurrentlyValid(exception)
        );

      // Check for conflicts among matching exceptions
      const conflicts: ExceptionConflictResolution[] = [];
      
      if (activeExceptions.length > 1) {
        // Group exceptions by scope to identify potential conflicts
        const scopeGroups = new Map<string, ComplianceException[]>();
        
        for (const exception of activeExceptions) {
          const scopeKey = this.getScopeKey(exception);
          if (!scopeGroups.has(scopeKey)) {
            scopeGroups.set(scopeKey, []);
          }
          scopeGroups.get(scopeKey)!.push(exception);
        }

        // Check for conflicts within each scope group
        for (const [scopeKey, groupExceptions] of scopeGroups) {
          if (groupExceptions.length > 1) {
            const conflictResolution = this.resolveExceptionConflicts(groupExceptions, criteria);
            conflicts.push(conflictResolution);
          }
        }
      }

      return {
        exceptions: activeExceptions,
        conflicts,
      };

    } catch (error) {
      this.logger.error('Failed to find matching exceptions:', error);
      return { exceptions: [], conflicts: [] };
    }
  }

  /**
   * Lists exceptions with filtering and pagination
   */
  async listExceptions(options: {
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    filter?: string;
    status?: ComplianceException['status'][];
    scope_type?: ExceptionScope['type'][];
  } = {}): Promise<{
    exceptions: Array<SavedObject<ComplianceException>>;
    total: number;
    page: number;
    perPage: number;
  }> {
    const {
      page = 1,
      perPage = 50,
      sortField = 'audit.created_at',
      sortOrder = 'desc',
      filter,
      status,
      scope_type,
    } = options;

    try {
      let kueryFilter: KueryNode | undefined;

      // Build filters
      const filters: string[] = [];
      
      if (status && status.length > 0) {
        filters.push(`status:(${status.join(' OR ')})`);
      }

      if (scope_type && scope_type.length > 0) {
        filters.push(`scope.type:(${scope_type.join(' OR ')})`);
      }

      if (filter) {
        filters.push(filter);
      }

      if (filters.length > 0) {
        const filterString = filters.map(f => `(${f})`).join(' AND ');
        // kueryFilter would be built here using @kbn/es-query
        // For simplicity, we'll use the filter string directly
      }

      const searchResult = await this.soClient.find<ComplianceException>({
        type: COMPLIANCE_EXCEPTION_SO_TYPE,
        page,
        perPage,
        sortField,
        sortOrder,
        filter: kueryFilter,
      });

      return {
        exceptions: searchResult.saved_objects,
        total: searchResult.total,
        page: searchResult.page,
        perPage: searchResult.per_page,
      };

    } catch (error) {
      this.logger.error('Failed to list exceptions:', error);
      return {
        exceptions: [],
        total: 0,
        page,
        perPage,
      };
    }
  }

  /**
   * Deletes an exception (soft delete with audit trail)
   */
  async deleteException(
    exceptionId: string,
    deletedBy: string,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Instead of actual deletion, mark as revoked
      const result = await this.updateException(
        exceptionId,
        {
          status: 'revoked',
          enabled: false,
        },
        deletedBy
      );

      if (result.success && result.exception) {
        // Add specific revocation entry to audit trail
        const now = new Date().toISOString();
        const newVersion = result.exception.attributes.audit.version + 1;

        await this.soClient.update<ComplianceException>(
          COMPLIANCE_EXCEPTION_SO_TYPE,
          exceptionId,
          {
            audit: {
              ...result.exception.attributes.audit,
              version: newVersion,
              change_history: [
                ...result.exception.attributes.audit.change_history,
                {
                  version: newVersion,
                  changed_by: deletedBy,
                  changed_at: now,
                  change_type: 'revoked',
                  change_description: `Exception revoked${reason ? `: ${reason}` : ''}`,
                },
              ],
            },
          },
          { version: result.exception.version }
        );
      }

      this.logger.info(`Revoked compliance exception: ${exceptionId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to delete exception ${exceptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Adds a comment to an exception
   */
  async addComment(
    exceptionId: string,
    comment: Omit<CommentInfo, 'id' | 'created_at'>
  ): Promise<{
    success: boolean;
    comment?: CommentInfo;
    error?: string;
  }> {
    try {
      const existingException = await this.soClient.get<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId
      );

      const newComment: CommentInfo = {
        ...comment,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };

      const updatedComments = [
        ...(existingException.attributes.comments || []),
        newComment,
      ];

      await this.soClient.update<ComplianceException>(
        COMPLIANCE_EXCEPTION_SO_TYPE,
        exceptionId,
        { comments: updatedComments },
        { version: existingException.version }
      );

      return {
        success: true,
        comment: newComment,
      };

    } catch (error) {
      this.logger.error(`Failed to add comment to exception ${exceptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validates exception configuration
   */
  private validateException(exception: ComplianceException): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!exception.name || exception.name.trim().length === 0) {
      errors.push('Exception name is required');
    }

    if (!exception.scope || !exception.scope.type) {
      errors.push('Exception scope type is required');
    }

    // Scope-specific validation
    if (exception.scope) {
      switch (exception.scope.type) {
        case 'benchmark':
        case 'rule':
        case 'host':
          if (!exception.scope.target_id) {
            errors.push(`Target ID is required for ${exception.scope.type} scope`);
          }
          break;
      }
    }

    // Time scope validation
    if (exception.time_scope) {
      if (exception.time_scope.type === 'temporary') {
        if (!exception.time_scope.end_date) {
          errors.push('End date is required for temporary exceptions');
        }
      }
      
      if (exception.time_scope.start_date && exception.time_scope.end_date) {
        if (new Date(exception.time_scope.start_date) >= new Date(exception.time_scope.end_date)) {
          errors.push('Start date must be before end date');
        }
      }
    }

    // Priority validation
    if (exception.priority < 0 || exception.priority > 100) {
      warnings.push('Priority should be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Checks for conflicts with existing exceptions
   */
  private async checkExceptionConflicts(
    newException: ComplianceException
  ): Promise<ExceptionConflictResolution> {
    // Simplified conflict detection - would be more sophisticated in practice
    return {
      conflictDetected: false,
      conflictingExceptions: [],
      resolutionReason: 'No conflicts detected',
      resolutionStrategy: 'priority',
    };
  }

  /**
   * Builds query for finding matching exceptions
   */
  private buildExceptionQuery(criteria: ExceptionMatchCriteria): KueryNode | undefined {
    // This would build a proper KueryNode based on criteria
    // For now, return undefined to match all
    return undefined;
  }

  /**
   * Checks if exception is currently valid based on time scope
   */
  private isExceptionCurrentlyValid(exception: ComplianceException): boolean {
    if (!exception.time_scope) {
      return true; // Permanent exception
    }

    const now = new Date();
    
    if (exception.time_scope.start_date) {
      if (now < new Date(exception.time_scope.start_date)) {
        return false; // Not yet active
      }
    }

    if (exception.time_scope.end_date) {
      if (now > new Date(exception.time_scope.end_date)) {
        return false; // Expired
      }
    }

    if (exception.time_scope.expiration_date) {
      if (now > new Date(exception.time_scope.expiration_date)) {
        return false; // Expired
      }
    }

    return true;
  }

  /**
   * Gets a unique scope key for grouping
   */
  private getScopeKey(exception: ComplianceException): string {
    return `${exception.scope.type}:${exception.scope.target_id || 'global'}`;
  }

  /**
   * Resolves conflicts between multiple exceptions
   */
  private resolveExceptionConflicts(
    exceptions: ComplianceException[],
    criteria: ExceptionMatchCriteria
  ): ExceptionConflictResolution {
    // Sort by priority (highest first)
    const sortedExceptions = exceptions.sort((a, b) => b.priority - a.priority);
    
    return {
      conflictDetected: true,
      winningException: sortedExceptions[0],
      conflictingExceptions: sortedExceptions.slice(1),
      resolutionReason: `Resolved by priority: highest priority exception (${sortedExceptions[0].priority}) takes precedence`,
      resolutionStrategy: 'priority',
    };
  }

  /**
   * Extracts changed values for audit trail
   */
  private extractChangedValues(
    original: ComplianceException,
    updates: Partial<ComplianceException>
  ): any {
    const changed: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'audit' && (original as any)[key] !== value) {
        changed[key] = (original as any)[key];
      }
    }
    
    return changed;
  }
}