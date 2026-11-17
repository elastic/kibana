/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Parameter, StackEvent } from '@aws-sdk/client-cloudformation';

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../common/types/rest_spec/iac_provisioner';
import type { RenderIacTemplateIntegration } from '../../../common/types/rest_spec/iac_provisioner';
import type {
  DeleteAwsOnboardingCredentialsResponse,
  AwsOnboardingStackStatus,
  AwsOnboardingTemplateInfo,
  CreateAwsOnboardingStackResponse,
  GetAwsOnboardingStackResponse,
  UpdateAwsOnboardingStackResponse,
} from '../../../common/types/rest_spec/aws_onboarding';
import { FleetError, FleetNotFoundError } from '../../errors';
import { appContextService } from '../app_context';
import { cloudConnectorService } from '../cloud_connector';
import { iacProvisionerService } from '../iac_provisioner';
import { buildIacProvisionerIntegrations, isBuildError } from '../iac_provisioner_integrations';
import { isIacProvisionerEnabled } from '../utils/iac_provisioner';

import { AwsCloudFormationClient } from './cloudformation_client';
import { awsOnboardingCredentialsService } from './credentials';
import { assumeOnboardingRole } from './sts';

interface ResolvedTemplate {
  templateUrl: string;
  info: AwsOnboardingTemplateInfo;
}

const COMPLETE_STATUSES = new Set(['CREATE_COMPLETE', 'UPDATE_COMPLETE']);

export const toStackStatus = (stackStatus: string | undefined): AwsOnboardingStackStatus => {
  if (!stackStatus) return 'not_found';
  if (COMPLETE_STATUSES.has(stackStatus)) return 'complete';
  if (stackStatus.endsWith('_IN_PROGRESS')) return 'in_progress';
  return 'failed';
};

/** The newest event by timestamp; only a failed event carries its reason. */
const toLatestEvent = (
  events: StackEvent[] | undefined
): GetAwsOnboardingStackResponse['latestEvent'] => {
  const newest = events?.reduce<StackEvent | undefined>(
    (latest, event) =>
      event.Timestamp && (!latest?.Timestamp || event.Timestamp > latest.Timestamp)
        ? event
        : latest,
    undefined
  );
  if (!newest?.Timestamp || !newest.LogicalResourceId || !newest.ResourceStatus) {
    return undefined;
  }
  const failed = newest.ResourceStatus.endsWith('_FAILED') && newest.ResourceStatusReason;
  return {
    resource: newest.LogicalResourceId,
    status: newest.ResourceStatus,
    timestamp: newest.Timestamp.toISOString(),
    ...(failed ? { reason: newest.ResourceStatusReason } : {}),
  };
};

export class AwsOnboardingStackService {
  /** One short-lived provisioning session per operation; fails in partially-managed mode. */
  private async getClient(
    purpose: string
  ): Promise<{ client: AwsCloudFormationClient; stackNamePrefix: string }> {
    const credentials = await awsOnboardingCredentialsService.getDecrypted();
    const session = await assumeOnboardingRole(credentials, 'provisioning', purpose);
    return {
      client: new AwsCloudFormationClient(session),
      stackNamePrefix: credentials.stackNamePrefix,
    };
  }

  /**
   * IaCP render when the provisioner is enabled (the pre-signed artifact URL stays server-side);
   * otherwise the caller's static template URL. `up_to_date` is returned when IaCP reports the
   * stored digest still matches (only possible when `templateSha` was sent).
   */
  private async resolveTemplate(args: {
    soClient: SavedObjectsClientContract;
    integrations: RenderIacTemplateIntegration[];
    templateUrl?: string;
    templateSha?: string;
  }): Promise<ResolvedTemplate | 'up_to_date'> {
    if (await isIacProvisionerEnabled()) {
      // Same resolution as the render route: attaches each package's installed version.
      const built = await buildIacProvisionerIntegrations({
        savedObjectsClient: args.soClient,
        requestedIntegrations: args.integrations,
      });
      if (isBuildError(built)) {
        throw new FleetError(built.errorMessage);
      }
      try {
        const rendered = await iacProvisionerService.renderTemplate({
          provider: AWS_CLOUD_PROVIDER,
          workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
          integrations: built.integrations,
          ...(args.templateSha ? { templateSha: args.templateSha } : {}),
        });
        if (rendered.render === false) {
          return 'up_to_date';
        }
        if (!rendered.artifactUrl) {
          throw new FleetError('IaC Provisioner rendered a template without an artifact URL');
        }
        return {
          templateUrl: rendered.artifactUrl,
          info: {
            source: 'iacp',
            templateSha: rendered.templateSha,
            blueprint: rendered.blueprint,
          },
        };
      } catch (error) {
        // Mirror the browser flow: when the provisioner cannot render, fall back to the package's
        // static template if the caller supplied one; otherwise surface the provisioner error.
        if (!args.templateUrl) {
          throw error;
        }
        appContextService
          .getLogger()
          .get('AwsOnboardingStackService')
          .warn(`IaC Provisioner render failed, using the static template: ${error.message}`);
      }
    }
    if (!args.templateUrl) {
      throw new FleetError(
        'No CloudFormation template available: the IaC Provisioner is disabled and no templateUrl was provided'
      );
    }
    return { templateUrl: args.templateUrl, info: { source: 'static' } };
  }

  private async declaredParameters(
    client: AwsCloudFormationClient,
    templateUrl: string,
    values: Record<string, string>,
    usePreviousForMissing: boolean
  ): Promise<Parameter[]> {
    const declared = await client.getDeclaredParameterKeys(templateUrl);
    return declared.flatMap((key): Parameter[] => {
      if (values[key] !== undefined) {
        return [{ ParameterKey: key, ParameterValue: values[key] }];
      }
      return usePreviousForMissing ? [{ ParameterKey: key, UsePreviousValue: true }] : [];
    });
  }

  public async create(args: {
    soClient: SavedObjectsClientContract;
    integrations: RenderIacTemplateIntegration[];
    templateUrl?: string;
    parameters: Record<string, string>;
  }): Promise<CreateAwsOnboardingStackResponse> {
    const logger = appContextService.getLogger().get('AwsOnboardingStackService');
    const { client, stackNamePrefix } = await this.getClient('create');
    const resolved = await this.resolveTemplate(args);
    if (resolved === 'up_to_date') {
      throw new FleetError('Unexpected render result for a new stack');
    }
    const stackName = `${stackNamePrefix}-${randomBytes(4).toString('hex')}`;
    const parameters = await this.declaredParameters(
      client,
      resolved.templateUrl,
      args.parameters,
      false
    );
    logger.info(
      `Creating CloudFormation stack ${stackName} (template source: ${
        resolved.info.source
      }, parameters: ${parameters.map((p) => p.ParameterKey).join(', ')})`
    );
    const stackId = await client.createStack({
      stackName,
      templateUrl: resolved.templateUrl,
      parameters,
    });
    return { stackId, stackName, template: resolved.info };
  }

  public async update(args: {
    soClient: SavedObjectsClientContract;
    cloudConnectorId: string;
    integrations: RenderIacTemplateIntegration[];
    templateUrl?: string;
    parameters?: Record<string, string>;
  }): Promise<UpdateAwsOnboardingStackResponse> {
    const logger = appContextService.getLogger().get('AwsOnboardingStackService');
    const connector = await cloudConnectorService.getById(args.soClient, args.cloudConnectorId);
    const stackArn = connector.iac_deployment_id;
    if (!stackArn) {
      throw new FleetNotFoundError(
        `Cloud connector ${args.cloudConnectorId} has no recorded CloudFormation stack ARN (iac_deployment_id)`
      );
    }
    const { client } = await this.getClient('update');
    const resolved = await this.resolveTemplate({
      soClient: args.soClient,
      integrations: args.integrations,
      templateUrl: args.templateUrl,
      templateSha: connector.iac_key ?? undefined,
    });
    if (resolved === 'up_to_date') {
      return { status: 'up_to_date' };
    }
    const parameters = await this.declaredParameters(
      client,
      resolved.templateUrl,
      args.parameters ?? {},
      true
    );
    logger.info(
      `Updating CloudFormation stack ${stackArn} (template source: ${resolved.info.source})`
    );
    const stackId = await client.updateStack({
      stackArn,
      templateUrl: resolved.templateUrl,
      parameters,
    });
    if (!stackId) {
      return { status: 'up_to_date' };
    }
    return { status: 'updating', stackId, template: resolved.info };
  }

  /**
   * Deletes the bootstrap stack (IAM user, access key, secret) with the very credentials it
   * created, so removing them from Kibana leaves nothing behind in AWS. Only the deletion is
   * started here: once the credentials are gone Kibana can no longer observe the stack.
   */
  public async deleteBootstrapStack(): Promise<
    DeleteAwsOnboardingCredentialsResponse['bootstrapStack']
  > {
    const logger = appContextService.getLogger().get('AwsOnboardingStackService');
    let credentials;
    try {
      credentials = await awsOnboardingCredentialsService.getDecrypted();
    } catch (error) {
      if (error instanceof FleetNotFoundError) {
        return 'skipped';
      }
      throw error;
    }
    if (!credentials.bootstrapStackArn) {
      return 'skipped';
    }
    // The bootstrap stack is deleted with the key's own inline permissions: the roles are part of
    // the stack being removed, so no session can outlive it.
    const client = new AwsCloudFormationClient({
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: '',
    });
    const started = await client.deleteStack(credentials.bootstrapStackArn);
    logger.info(
      started
        ? `Deleting bootstrap CloudFormation stack ${credentials.bootstrapStackArn}`
        : `Bootstrap CloudFormation stack ${credentials.bootstrapStackArn} no longer exists`
    );
    return started ? 'deletion_started' : 'skipped';
  }

  /** One events call per status check; a failed lookup only degrades the progress detail. */
  private async readStackEvents(
    client: AwsCloudFormationClient,
    stackArn: string
  ): Promise<StackEvent[] | undefined> {
    try {
      return await client.describeStackEvents(stackArn);
    } catch (error) {
      appContextService
        .getLogger()
        .warn(
          `Could not read the CloudFormation stack events: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      return undefined;
    }
  }

  /**
   * The stack-level reason is empty once a failed create has rolled back and been deleted, so
   * name the earliest failed resource instead: later failures are usually its rollback.
   */
  private findFailedResourceReason(
    events: StackEvent[] | undefined,
    stackName: string | undefined
  ): string | undefined {
    // Events are newest first, so the last match is the earliest failure.
    const failed = events
      ?.filter(
        (event) =>
          event.ResourceStatus?.endsWith('_FAILED') &&
          event.ResourceType !== 'AWS::CloudFormation::Stack' &&
          event.LogicalResourceId !== stackName
      )
      .pop();
    return failed?.ResourceStatusReason
      ? `${failed.LogicalResourceId}: ${failed.ResourceStatusReason}`
      : undefined;
  }

  /** A provisioning session for status reads, so a caller polling a stack assumes the role once. */
  public async createStatusClient(): Promise<AwsCloudFormationClient> {
    const { client } = await this.getClient('status');
    return client;
  }

  public async status(stackArn: string): Promise<GetAwsOnboardingStackResponse> {
    return this.statusWith(await this.createStatusClient(), stackArn);
  }

  public async statusWith(
    client: AwsCloudFormationClient,
    stackArn: string
  ): Promise<GetAwsOnboardingStackResponse> {
    const stack = await client.describeStack(stackArn);
    if (!stack) {
      return { status: 'not_found' };
    }
    const status = toStackStatus(stack.StackStatus);
    const outputs =
      status === 'complete'
        ? {
            roleArn: stack.Outputs?.find((o) => o.OutputKey === 'RoleArn')?.OutputValue,
            oidcProviderArn: stack.Outputs?.find((o) => o.OutputKey === 'OidcProviderArn')
              ?.OutputValue,
          }
        : undefined;
    const events = await this.readStackEvents(client, stackArn);
    const latestEvent = toLatestEvent(events);
    const reason =
      status === 'failed'
        ? this.findFailedResourceReason(events, stack.StackName) ?? stack.StackStatusReason
        : stack.StackStatusReason;
    return {
      status,
      stackStatus: stack.StackStatus,
      reason,
      ...(latestEvent ? { latestEvent } : {}),
      ...(outputs ? { outputs } : {}),
    };
  }
}

export const awsOnboardingStackService = new AwsOnboardingStackService();
