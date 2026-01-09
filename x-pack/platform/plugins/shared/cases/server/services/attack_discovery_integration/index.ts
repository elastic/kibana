/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentService } from '../attachments';
import type { CasesService } from '../cases';

/**
 * Attack discovery alert information for attaching to a case
 */
export interface AttackDiscoveryAlertInfo {
    alertId: string;
    index: string;
    title?: string;
    timestamp?: string;
    generationUuid?: string;
}

/**
 * Result of triggering attack discovery
 */
export interface AttackDiscoveryTriggerResult {
    executionUuid: string;
    success: boolean;
    attackDiscoveryAlerts?: AttackDiscoveryAlertInfo[];
    error?: string;
}

/**
 * Function type for triggering attack discovery
 */
export type TriggerAttackDiscoveryFn = (params: {
    alertIds: string[];
    caseId: string;
    alertsIndexPattern: string;
    request: import('@kbn/core/server').KibanaRequest;
}) => Promise<AttackDiscoveryTriggerResult>;

/**
 * Function to attach attack discoveries to a case as external reference attachments
 */
export type AttachAttackDiscoveriesFn = (params: {
    caseId: string;
    attackDiscoveries: Array<{
        attackDiscoveryAlertId: string;
        index: string;
        generationUuid: string;
        title: string;
        timestamp: string;
    }>;
    owner: string;
}) => Promise<void>;

export interface AttackDiscoveryIntegrationService {
    /**
     * Triggers attack discovery for a case when alerts are attached.
     * This is called automatically when alerts are added to a case.
     *
     * @param caseId - The ID of the case
     * @param attachmentService - The attachment service to use for operations
     * @param caseService - The case service to get case details
     * @param attachAlerts - Function to attach alerts to the case
     * @returns Promise that resolves when attack discovery is triggered (or skipped)
     */
    triggerAttackDiscoveryForCase: (
        caseId: string,
        attachmentService: AttachmentService,
        caseService: CasesService,
        attachAttackDiscoveries: AttachAttackDiscoveriesFn
    ) => Promise<void>;
}

/**
 * Creates a no-op attack discovery integration service.
 * This is used when attack discovery is not available or disabled.
 */
export const createNoOpAttackDiscoveryIntegrationService = (): AttackDiscoveryIntegrationService => {
    return {
        triggerAttackDiscoveryForCase: async (
            _caseId: string,
            _attachmentService: AttachmentService,
            _caseService: CasesService,
            _attachAttackDiscoveries: AttachAttackDiscoveriesFn
        ) => {
            // No-op: attack discovery integration is not available
        },
    };
};

/**
 * Creates an attack discovery integration service that triggers attack discovery
 * when alerts are attached to cases.
 *
 * @param logger - Logger instance
 * @param triggerAttackDiscovery - Function to trigger attack discovery (optional)
 * @param alertsIndexPattern - Default alerts index pattern (optional)
 * @param getRequest - Function to get the current request (optional)
 * @returns Attack discovery integration service
 */
export const createAttackDiscoveryIntegrationService = ({
    logger,
    triggerAttackDiscovery,
    alertsIndexPattern,
    getRequest,
}: {
    logger: Logger;
    triggerAttackDiscovery?: TriggerAttackDiscoveryFn;
    alertsIndexPattern?: string;
    getRequest?: () => import('@kbn/core/server').KibanaRequest | undefined;
}): AttackDiscoveryIntegrationService => {
    return {
        triggerAttackDiscoveryForCase: async (
            caseId: string,
            attachmentService: AttachmentService,
            caseService: CasesService,
            attachAttackDiscoveries: AttachAttackDiscoveriesFn
        ) => {
            try {
                // If attack discovery trigger function is not available, skip
                if (!triggerAttackDiscovery) {
                    logger.debug(
                        `Attack discovery integration not available for case ${caseId}, skipping`
                    );
                    return;
                }

                // Get all alert IDs from the case
                const alertIds = await attachmentService.getter.getAllAlertIds({ caseId });

                if (alertIds.size === 0) {
                    logger.debug(`No alerts in case ${caseId}, skipping attack discovery`);
                    return;
                }

                // Don't trigger attack discovery if there are less than 2 alerts
                if (alertIds.size < 2) {
                    logger.debug(
                        `Case ${caseId} has less than 2 alerts (${alertIds.size}), skipping attack discovery`
                    );
                    return;
                }

                const alertIdsArray = Array.from(alertIds);

                // Use provided alerts index pattern or default
                const effectiveAlertsIndexPattern =
                    // alertsIndexPattern || 
                    '.alerts-security.alerts-default';

                // Get the request - try to get it from the getter, or create a system request as fallback
                const request =
                    getRequest?.() ||
                    ({
                        headers: {},
                        url: { path: '/internal' },
                    } as unknown as import('@kbn/core/server').KibanaRequest);

                // Log parameters being passed to attack discovery trigger
                logger.debug(
                    `[Attack Discovery Integration] Triggering attack discovery for case ${caseId} with parameters: ` +
                    `alertIds=[${alertIdsArray.slice(0, 5).join(', ')}${alertIdsArray.length > 5 ? `, ... (${alertIdsArray.length} total)` : ''}], ` +
                    `alertsIndexPattern=${effectiveAlertsIndexPattern}, ` +
                    `alertCount=${alertIdsArray.length}, ` +
                    `hasRequest=${!!request}`
                );

                // Trigger attack discovery with case-scoped alert filter
                const result = await triggerAttackDiscovery({
                    caseId,
                    alertIds: alertIdsArray,
                    alertsIndexPattern: effectiveAlertsIndexPattern,
                    request,
                });

                if (!result.success) {
                    logger.error(
                        `Attack discovery generation failed for case ${caseId}: ${result.error || 'Unknown error'}`
                    );
                    return;
                }

                // Get case to determine owner
                const theCase = await caseService.getCase({ id: caseId });

                // Attach attack discoveries to the case as external reference attachments
                if (result.attackDiscoveryAlerts && result.attackDiscoveryAlerts.length > 0) {
                    // Transform attack discovery alerts to include metadata
                    const attackDiscoveries = result.attackDiscoveryAlerts.map((alert) => ({
                        attackDiscoveryAlertId: alert.alertId,
                        index: alert.index,
                        generationUuid: alert.generationUuid || result.executionUuid,
                        title: alert.title || `Attack Discovery ${alert.alertId}`,
                        timestamp: alert.timestamp || new Date().toISOString(),
                    }));

                    await attachAttackDiscoveries({
                        caseId,
                        attackDiscoveries,
                        owner: theCase.attributes.owner,
                    });
                }

                logger.info(
                    `Successfully triggered attack discovery for case ${caseId}, execution UUID: ${result.executionUuid}, attached ${result.attackDiscoveryAlerts?.length || 0} attack discovery alerts`
                );
            } catch (error) {
                // Log error but don't fail the alert attachment operation
                logger.error(
                    `Failed to trigger attack discovery for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        },
    };
};


