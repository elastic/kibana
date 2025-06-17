/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { Logger, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { AgentPolicySOAttributes } from '../types';
import type { LicenseService } from '../../common/services/license';
import type { AgentPolicy } from '../../common';
import {
  isAgentPolicyValidForLicense,
  unsetAgentPolicyAccordingToLicenseLevel,
} from '../../common/services/agent_policy_config';
import { agentPolicyService, getAgentPolicySavedObjectType } from './agent_policy';
import { appContextService } from './app_context';

export class PolicyWatcher {
  private subscription: Subscription | undefined;

  constructor(private logger: Logger) {}

  public start(licenseService: LicenseService) {
    this.subscription = licenseService.getLicenseInformation$()?.subscribe(this.watch.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public async watch(license: ILicense) {
    const log = this.logger.get('endpoint', 'agentPolicyLicenseWatch');

    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(
      soClient,
      { fields: ['is_protected', 'id', 'revision'], spaceId: '*' } // Don't forget to extend this to include all fields that are used in the `isAgentPolicyValidForLicense` function
    );

    log.info('Checking agent policies for compliance with the current license.');

    const updatedAgentPolicies: Array<SavedObjectsUpdateResponse<AgentPolicySOAttributes>> = [];

    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      const policiesToUpdate = agentPolicyPageResults.reduce((acc: AgentPolicy[], policy) => {
        if (!isAgentPolicyValidForLicense(policy, license)) {
          acc.push(unsetAgentPolicyAccordingToLicenseLevel(policy, license) as AgentPolicy);
        }
        return acc;
      }, []);

      if (policiesToUpdate.length === 0) {
        break;
      }
      const savedObjectType = await getAgentPolicySavedObjectType();

      const { saved_objects: bulkUpdateSavedObjects } =
        await soClient.bulkUpdate<AgentPolicySOAttributes>(
          policiesToUpdate.map((policy) => {
            const { id, revision, ...policyContent } = policy;
            const updatedPolicy = {
              type: savedObjectType,
              id,
              attributes: {
                ...policyContent,
                revision: revision + 1,
                updated_at: new Date().toISOString(),
                updated_by: 'system',
              },
              ...(policyContent.space_ids?.length ? { namespace: policyContent.space_ids[0] } : {}),
            };
            return updatedPolicy;
          })
        );
      updatedAgentPolicies.push(...bulkUpdateSavedObjects);
    }

    const failedPolicies: Array<{
      id: string;
      error: Error | SavedObjectError;
    }> = [];

    updatedAgentPolicies.forEach((policy) => {
      if (policy.error) {
        failedPolicies.push({
          id: policy.id,
          error: policy.error,
        });
      }
    });

    const updatedPoliciesSuccess = updatedAgentPolicies.filter((policy) => !policy.error);

    if (!updatedPoliciesSuccess.length && !failedPolicies.length) {
      log.info(`All agent policies are compliant, nothing to do!`);
    } else if (updatedPoliciesSuccess.length && failedPolicies.length) {
      const totalPolicies = updatedPoliciesSuccess.length + failedPolicies.length;
      log.error(
        `Done - ${
          failedPolicies.length
        } out of ${totalPolicies} were unsuccessful. Errors encountered:\n${failedPolicies
          .map((e) => `Policy [${e.id}] failed to update due to error: ${e.error.message}`)
          .join('\n')}`
      );
    } else if (updatedPoliciesSuccess.length) {
      log.info(
        `Done - ${updatedPoliciesSuccess.length} out of ${updatedPoliciesSuccess.length} were successful. No errors encountered.`
      );
    } else {
      log.error(
        `Done - all ${failedPolicies.length} failed to update. Errors encountered:\n${failedPolicies
          .map((e) => `Policy [${e.id}] failed to update due to error: ${e.error.message}`)
          .join('\n')}`
      );
    }
  }
}
