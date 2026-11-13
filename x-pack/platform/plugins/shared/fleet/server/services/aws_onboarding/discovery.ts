/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudTrailClient, DescribeTrailsCommand } from '@aws-sdk/client-cloudtrail';
import { CostExplorerClient, GetDimensionValuesCommand } from '@aws-sdk/client-cost-explorer';
import { GuardDutyClient, ListDetectorsCommand } from '@aws-sdk/client-guardduty';

import type {
  AwsOnboardingDiscoveryResponse,
  AwsOnboardingVerifyResponse,
} from '../../../common/types/rest_spec/aws_onboarding';

import { awsOnboardingCredentialsService, getManagementMode } from './credentials';
import { assumeOnboardingRole, getCallerAccountId } from './sts';
import type { AwsSessionCredentials } from './sts';

const DAYS_OF_USAGE = 30;
/** Cost Explorer is a global service served from us-east-1 regardless of where the data is. */
const COST_EXPLORER_REGION = 'us-east-1';

const message = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/**
 * Read-only look at the customer account so the wizard can pre-select services and pre-fill
 * settings. Every lookup runs on one short-lived discovery session and fails independently:
 * a missing permission or a disabled service becomes an entry in `errors`, not a failed call.
 */
export class AwsOnboardingDiscoveryService {
  /**
   * Assumes each stored role once and discards the session: the equivalent of confirming that a
   * delegation request was approved. Never writes anything.
   */
  public async verify(): Promise<AwsOnboardingVerifyResponse> {
    const credentials = await awsOnboardingCredentialsService.getDecrypted();
    const result: AwsOnboardingVerifyResponse = {
      mode: getManagementMode(credentials),
      discovery: { ok: false },
    };
    try {
      const session = await assumeOnboardingRole(credentials, 'discovery', 'verify');
      result.accountId = await getCallerAccountId(session);
      result.discovery = { ok: true };
    } catch (error) {
      result.discovery = { ok: false, error: message(error) };
    }
    if (credentials.provisioningRoleArn) {
      try {
        await assumeOnboardingRole(credentials, 'provisioning', 'verify');
        result.provisioning = { ok: true };
      } catch (error) {
        result.provisioning = { ok: false, error: message(error) };
      }
    }
    return result;
  }

  public async discover(): Promise<AwsOnboardingDiscoveryResponse> {
    const credentials = await awsOnboardingCredentialsService.getDecrypted();
    const session = await assumeOnboardingRole(credentials, 'discovery', 'discovery');
    const result: AwsOnboardingDiscoveryResponse = {
      region: session.region,
      servicesInUse: [],
      cloudtrail: [],
      guarddutyDetectorIds: [],
      errors: [],
    };
    await Promise.all([
      this.lookup(result, 'sts', async () => {
        result.accountId = await getCallerAccountId(session);
      }),
      this.lookup(result, 'costExplorer', async () => {
        result.servicesInUse = await this.servicesInUse(session);
      }),
      this.lookup(result, 'cloudtrail', async () => {
        result.cloudtrail = await this.trails(session);
      }),
      this.lookup(result, 'guardduty', async () => {
        result.guarddutyDetectorIds = await this.detectors(session);
      }),
    ]);
    return result;
  }

  private async lookup(
    result: AwsOnboardingDiscoveryResponse,
    source: AwsOnboardingDiscoveryResponse['errors'][number]['source'],
    fn: () => Promise<void>
  ) {
    try {
      await fn();
    } catch (error) {
      result.errors.push({ source, message: message(error) });
    }
  }

  private async servicesInUse(session: AwsSessionCredentials): Promise<string[]> {
    const client = new CostExplorerClient({
      region: COST_EXPLORER_REGION,
      credentials: session,
      maxAttempts: 2,
    });
    const end = new Date();
    const start = new Date(end.getTime() - DAYS_OF_USAGE * 24 * 60 * 60 * 1000);
    const toDay = (d: Date) => d.toISOString().slice(0, 10);
    const names: string[] = [];
    let nextPageToken: string | undefined;
    do {
      const page = await client.send(
        new GetDimensionValuesCommand({
          Dimension: 'SERVICE',
          Context: 'COST_AND_USAGE',
          TimePeriod: { Start: toDay(start), End: toDay(end) },
          NextPageToken: nextPageToken,
        })
      );
      for (const value of page.DimensionValues ?? []) {
        if (value.Value) names.push(value.Value);
      }
      nextPageToken = page.NextPageToken;
    } while (nextPageToken);
    return names.sort();
  }

  private async trails(session: AwsSessionCredentials) {
    const client = new CloudTrailClient({
      region: session.region,
      credentials: session,
      maxAttempts: 2,
    });
    const page = await client.send(new DescribeTrailsCommand({ includeShadowTrails: true }));
    return (page.trailList ?? []).map((t) => ({
      name: t.Name,
      s3BucketName: t.S3BucketName,
      isMultiRegion: t.IsMultiRegionTrail,
      homeRegion: t.HomeRegion,
    }));
  }

  private async detectors(session: AwsSessionCredentials): Promise<string[]> {
    const client = new GuardDutyClient({
      region: session.region,
      credentials: session,
      maxAttempts: 2,
    });
    const page = await client.send(new ListDetectorsCommand({}));
    return page.DetectorIds ?? [];
  }
}

export const awsOnboardingDiscoveryService = new AwsOnboardingDiscoveryService();
