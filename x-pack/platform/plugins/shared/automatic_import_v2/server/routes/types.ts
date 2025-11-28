import { InputType } from '../../common';
import { AuthenticatedUser } from '@kbn/core/server';

export interface CreateIntegrationParams {
  integrationParams: IntegrationParams;
  authenticatedUser: AuthenticatedUser;
}

export interface CreateDataStreamParams {
  dataStreamParams: DataStreamParams;
  authenticatedUser: AuthenticatedUser;
}

export interface IntegrationParams {
  integrationId: string;
  logo?: string;
  description: string;
  title: string;
}

export interface DataStreamParams {
  integrationId: string;
  dataStreamId: string;
  title: string;
  description: string;
  inputTypes: InputType[];
  rawSamples: string[];
  originalSource: {
    sourceType: 'file' | 'index';
    sourceValue: string;
  }
  jobInfo?: {
    jobId: string;
    jobType: string;
    status: string;
  };
  metadata: {
    sampleCount?: number;
    createdAt: string;
  };
}
