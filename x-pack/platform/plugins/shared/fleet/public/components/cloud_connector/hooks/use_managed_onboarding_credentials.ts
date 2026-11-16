/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';

import type {
  DeleteAwsOnboardingCredentialsRequestQuery,
  DeleteAwsOnboardingCredentialsResponse,
  PutAwsOnboardingCredentialsRequest,
} from '../../../../common/types/rest_spec/aws_onboarding';
import { useStartServices } from '../../../hooks';
import {
  sendDeleteAwsOnboardingCredentials,
  sendPutAwsOnboardingCredentials,
} from '../../../hooks/use_request/aws_onboarding';

import { AWS_ONBOARDING_CREDENTIALS_QUERY_KEY } from './use_managed_onboarding';

const toError = (error: unknown): Error =>
  (error as { body?: { message?: string } })?.body?.message
    ? new Error((error as { body: { message: string } }).body.message)
    : error instanceof Error
    ? error
    : new Error(String(error));

/** Stores (PUT) or removes (DELETE) the bootstrap credentials; the secret is sent once and never kept client-side. */
export const useManagedOnboardingCredentials = () => {
  const { notifications } = useStartServices();
  const queryClient = useQueryClient();

  const save = useMutation(
    async (body: PutAwsOnboardingCredentialsRequest) => {
      const { data, error } = await sendPutAwsOnboardingCredentials(body);
      if (error || !data) {
        throw toError(error);
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([AWS_ONBOARDING_CREDENTIALS_QUERY_KEY]);
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.saveSuccess', {
            defaultMessage: 'Managed onboarding credentials stored',
          }),
        });
      },
      onError: (error: Error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.saveError', {
            defaultMessage: 'Failed to store managed onboarding credentials',
          }),
        });
      },
    }
  );

  const remove = useMutation(
    async (query: DeleteAwsOnboardingCredentialsRequestQuery = {}) => {
      const { data, error } = await sendDeleteAwsOnboardingCredentials(query);
      if (error || !data) {
        throw toError(error);
      }
      return data;
    },
    {
      onSuccess: (data: DeleteAwsOnboardingCredentialsResponse) => {
        queryClient.invalidateQueries([AWS_ONBOARDING_CREDENTIALS_QUERY_KEY]);
        notifications.toasts.addSuccess({
          title:
            data.bootstrapStack === 'deletion_started'
              ? i18n.translate(
                  'xpack.fleet.cloudConnector.managedOnboarding.removeSuccessWithStack',
                  {
                    defaultMessage:
                      'Managed onboarding credentials removed; the bootstrap stack is being deleted in AWS',
                  }
                )
              : i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.removeSuccess', {
                  defaultMessage: 'Managed onboarding credentials removed',
                }),
        });
      },
      onError: (error: Error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.removeError', {
            defaultMessage: 'Failed to remove managed onboarding credentials',
          }),
        });
      },
    }
  );

  return { save, remove };
};
