/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
} from '@aws-sdk/client-cloudformation';
import type { Parameter, Stack, StackEvent } from '@aws-sdk/client-cloudformation';

import type { AwsSessionCredentials } from './sts';

/** Thin wrapper so the stack service never touches SDK command classes directly. TemplateURL is never logged. */
export class AwsCloudFormationClient {
  private readonly client: CloudFormationClient;

  /** Built from a short-lived session (assumed role today, delegated token later), never the stored key. */
  constructor(session: AwsSessionCredentials) {
    this.client = new CloudFormationClient({
      region: session.region,
      credentials: {
        accessKeyId: session.accessKeyId,
        secretAccessKey: session.secretAccessKey,
        sessionToken: session.sessionToken,
      },
      maxAttempts: 3,
    });
  }

  /** Parameter keys the template declares; CloudFormation rejects undeclared ones. */
  public async getDeclaredParameterKeys(templateUrl: string): Promise<string[]> {
    const summary = await this.client.send(
      new GetTemplateSummaryCommand({ TemplateURL: templateUrl })
    );
    return (summary.Parameters ?? [])
      .map((parameter) => parameter.ParameterKey)
      .filter((key): key is string => Boolean(key));
  }

  public async createStack(args: {
    stackName: string;
    templateUrl: string;
    parameters: Parameter[];
  }): Promise<string> {
    const result = await this.client.send(
      new CreateStackCommand({
        StackName: args.stackName,
        TemplateURL: args.templateUrl,
        Parameters: args.parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        OnFailure: 'DELETE',
        Tags: [{ Key: 'elastic:managed-by', Value: 'kibana' }],
      })
    );
    if (!result.StackId) {
      throw new Error('CloudFormation CreateStack returned no StackId');
    }
    return result.StackId;
  }

  /** Starts deletion; false when the stack is already gone. */
  public async deleteStack(stackArn: string): Promise<boolean> {
    try {
      await this.client.send(new DeleteStackCommand({ StackName: stackArn }));
      return true;
    } catch (error) {
      if (isStackNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  /** Undefined when the stack no longer exists (e.g. deleted after a failed create). */
  public async describeStack(stackArn: string): Promise<Stack | undefined> {
    try {
      const result = await this.client.send(new DescribeStacksCommand({ StackName: stackArn }));
      return result.Stacks?.[0];
    } catch (error) {
      if (isStackNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /** First page only (newest first), which is enough to find what failed a recent create. */
  public async describeStackEvents(stackArn: string): Promise<StackEvent[]> {
    const result = await this.client.send(new DescribeStackEventsCommand({ StackName: stackArn }));
    return result.StackEvents ?? [];
  }
}

const getAwsErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isStackNotFoundError = (error: unknown): boolean =>
  (error as { name?: string })?.name === 'ValidationError' &&
  getAwsErrorMessage(error).includes('does not exist');

/** True for errors raised by the AWS SDK (they carry request metadata). */
export const isAwsSdkError = (error: unknown): error is Error & { name: string } =>
  error instanceof Error && '$metadata' in error;
