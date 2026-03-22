/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

export interface ApprovalRequest {
  approval_id: string;
  exception_id: string;
  exception_name: string;
  scope: {
    type: 'host' | 'rule' | 'global';
    target_id?: string;
  };
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    business_justification: string;
    security_impact: string;
    affected_hosts_count: number;
    affected_rules_count: number;
  };
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvers: string[];
  auto_approve_eligible: boolean;
}

export interface ApprovalPolicy {
  auto_approve_conditions: {
    max_risk_level: 'low' | 'medium' | 'high';
    max_affected_hosts: number;
    allowed_scopes: Array<'host' | 'rule' | 'global'>;
    max_duration_days: number;
  };
  required_approvers: number;
  approval_timeout_hours: number;
}

/**
 * Service for managing exception approval workflows
 * Handles submission, approval, rejection, and expiration of approval requests
 */
export class ExceptionApprovalService {
  private readonly DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
    auto_approve_conditions: {
      max_risk_level: 'low',
      max_affected_hosts: 5,
      allowed_scopes: ['host'],
      max_duration_days: 30,
    },
    required_approvers: 1,
    approval_timeout_hours: 72,
  };

  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Submit exception for approval
   */
  async submitForApproval(params: {
    exceptionId: string;
    requestedBy: string;
    riskAssessment: ApprovalRequest['risk_assessment'];
    approvers?: string[];
  }): Promise<ApprovalRequest> {
    this.logger.info(`Submitting exception ${params.exceptionId} for approval`);

    // Get exception details
    const exception = await this.soClient.get('osquery-compliance-exception', params.exceptionId);

    const exceptionAttrs = exception.attributes as any;

    // Determine if auto-approval eligible
    const autoApproveEligible = this.isAutoApproveEligible(
      params.riskAssessment,
      exceptionAttrs,
      this.DEFAULT_APPROVAL_POLICY
    );

    // Create approval request
    const approvalRequest: ApprovalRequest = {
      approval_id: `approval-${Date.now()}`,
      exception_id: params.exceptionId,
      exception_name: exceptionAttrs.name,
      scope: exceptionAttrs.scope,
      risk_assessment: params.riskAssessment,
      requested_by: params.requestedBy,
      requested_at: new Date().toISOString(),
      status: autoApproveEligible ? 'approved' : 'pending',
      approvers: params.approvers || [],
      auto_approve_eligible: autoApproveEligible,
    };

    // Save approval request
    await this.soClient.create('osquery-compliance-approval', approvalRequest, {
      id: approvalRequest.approval_id,
    });

    // If auto-approved, immediately approve exception
    if (autoApproveEligible) {
      await this.autoApproveException(params.exceptionId, approvalRequest.approval_id);
    } else {
      // Send notifications to approvers
      await this.notifyApprovers(approvalRequest);
    }

    return approvalRequest;
  }

  /**
   * Approve exception
   */
  async approve(approvalId: string, approverId: string, comments?: string): Promise<void> {
    this.logger.info(`Approving exception approval ${approvalId} by ${approverId}`);

    // Get approval request
    const approval = await this.soClient.get('osquery-compliance-approval', approvalId);

    const approvalAttrs = approval.attributes as ApprovalRequest;

    if (approvalAttrs.status !== 'pending') {
      throw new Error(`Approval ${approvalId} is not pending (status: ${approvalAttrs.status})`);
    }

    // Update approval status
    await this.soClient.update('osquery-compliance-approval', approvalId, {
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      approval_comments: comments,
    });

    // Enable exception
    await this.soClient.update('osquery-compliance-exception', approvalAttrs.exception_id, {
      status: 'active',
      enabled: true,
      approval_status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    });

    // Add to audit trail
    await this.addAuditEntry(approvalAttrs.exception_id, {
      action: 'approved',
      user: approverId,
      timestamp: new Date().toISOString(),
      details: comments,
    });

    this.logger.info(`Exception ${approvalAttrs.exception_id} approved by ${approverId}`);
  }

  /**
   * Reject exception
   */
  async reject(approvalId: string, approverId: string, reason: string): Promise<void> {
    this.logger.info(`Rejecting exception approval ${approvalId} by ${approverId}`);

    const approval = await this.soClient.get('osquery-compliance-approval', approvalId);

    const approvalAttrs = approval.attributes as ApprovalRequest;

    // Update approval status
    await this.soClient.update('osquery-compliance-approval', approvalId, {
      status: 'rejected',
      rejected_by: approverId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    });

    // Mark exception as rejected
    await this.soClient.update('osquery-compliance-exception', approvalAttrs.exception_id, {
      status: 'rejected',
      enabled: false,
      approval_status: 'rejected',
    });

    // Add to audit trail
    await this.addAuditEntry(approvalAttrs.exception_id, {
      action: 'rejected',
      user: approverId,
      timestamp: new Date().toISOString(),
      details: reason,
    });

    this.logger.info(`Exception ${approvalAttrs.exception_id} rejected by ${approverId}`);
  }

  /**
   * Check if exception is eligible for auto-approval
   */
  private isAutoApproveEligible(
    riskAssessment: ApprovalRequest['risk_assessment'],
    exceptionAttrs: any,
    policy: ApprovalPolicy
  ): boolean {
    const conditions = policy.auto_approve_conditions;

    // Check risk level
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const assessmentRiskIndex = riskLevels.indexOf(riskAssessment.risk_level);
    const maxRiskIndex = riskLevels.indexOf(conditions.max_risk_level);

    if (assessmentRiskIndex > maxRiskIndex) {
      return false;
    }

    // Check affected hosts
    if (riskAssessment.affected_hosts_count > conditions.max_affected_hosts) {
      return false;
    }

    // Check scope
    if (!conditions.allowed_scopes.includes(exceptionAttrs.scope.type)) {
      return false;
    }

    // Check duration (if time-bound)
    if (exceptionAttrs.time_scope?.type === 'temporary' && exceptionAttrs.time_scope?.end_date) {
      const durationMs =
        new Date(exceptionAttrs.time_scope.end_date).getTime() - Date.now();
      const durationDays = durationMs / (24 * 60 * 60 * 1000);

      if (durationDays > conditions.max_duration_days) {
        return false;
      }
    }

    return true;
  }

  /**
   * Auto-approve exception (when eligible)
   */
  private async autoApproveException(exceptionId: string, approvalId: string): Promise<void> {
    this.logger.info(`Auto-approving exception ${exceptionId}`);

    await this.soClient.update('osquery-compliance-exception', exceptionId, {
      status: 'active',
      enabled: true,
      approval_status: 'auto_approved',
      approved_by: 'system',
      approved_at: new Date().toISOString(),
    });

    await this.addAuditEntry(exceptionId, {
      action: 'auto_approved',
      user: 'system',
      timestamp: new Date().toISOString(),
      details: 'Exception met auto-approval criteria',
    });
  }

  /**
   * Notify approvers of pending exception
   */
  private async notifyApprovers(approvalRequest: ApprovalRequest): Promise<void> {
    // TODO: Integrate with Kibana actions/connectors for email/Slack notifications
    this.logger.info(
      `Notifying approvers for exception ${approvalRequest.exception_id}`,
      {
        approvers: approvalRequest.approvers,
      }
    );

    // Placeholder for notification logic
    // Would use Kibana actions framework to send:
    // - Email to approvers
    // - Slack message to security channel
    // - In-app notification
  }

  /**
   * Add entry to exception audit trail
   */
  private async addAuditEntry(
    exceptionId: string,
    entry: {
      action: string;
      user: string;
      timestamp: string;
      details?: string;
    }
  ): Promise<void> {
    const exception = await this.soClient.get('osquery-compliance-exception', exceptionId);

    const currentTrail = (exception.attributes as any).audit_trail || [];

    await this.soClient.update('osquery-compliance-exception', exceptionId, {
      audit_trail: [...currentTrail, entry],
    });
  }

  /**
   * Check for expired approval requests
   * Should be called periodically via Task Manager
   */
  async expirePendingApprovals(timeoutHours: number = 72): Promise<number> {
    const cutoffTime = new Date(Date.now() - timeoutHours * 60 * 60 * 1000).toISOString();

    const { saved_objects } = await this.soClient.find({
      type: 'osquery-compliance-approval',
      filter: `osquery-compliance-approval.attributes.status:"pending" AND osquery-compliance-approval.attributes.requested_at < "${cutoffTime}"`,
      perPage: 1000,
    });

    let expiredCount = 0;

    for (const so of saved_objects) {
      const approvalAttrs = so.attributes as ApprovalRequest;

      // Mark as expired
      await this.soClient.update('osquery-compliance-approval', so.id, {
        status: 'expired',
        expired_at: new Date().toISOString(),
      });

      // Update exception status
      await this.soClient.update('osquery-compliance-exception', approvalAttrs.exception_id, {
        status: 'rejected',
        approval_status: 'expired',
      });

      expiredCount++;
    }

    if (expiredCount > 0) {
      this.logger.info(`Expired ${expiredCount} pending approval requests`);
    }

    return expiredCount;
  }
}
