/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType } from '../../common/datasource_types';

export const authenticationStrings = {
  title: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.title', {
      defaultMessage: 'Authentication',
    }),

  preferredMethodLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.label', {
      defaultMessage: 'Preferred method',
    }),

  recommendedBadge: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.recommended', {
      defaultMessage: 'Recommended',
    }),

  learnMore: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.learnMore', {
      defaultMessage: 'Learn more',
    }),

  federatedIdentityLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.federatedIdentity', {
      defaultMessage: 'Federated Identity',
    }),

  accessAndSecretKeysLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.accessAndSecretKeys', {
      defaultMessage: 'Access and Secret Keys',
    }),

  azureCredentialsLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.azure.credentials', {
      defaultMessage: 'Credentials',
    }),

  anonymousLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.authentication.anonymous', {
      defaultMessage: 'Anonymous',
    }),

  federatedIdentityDescription: {
    s3: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.s3',
        {
          defaultMessage:
            'No credentials are stored. AWS trusts the identity Elastic issues for your project or deployment.',
        }
      ),
    gcs: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.gcs',
        {
          defaultMessage:
            'No keys are stored. GCP trusts the identity Elastic issues and grants scoped read access to your bucket.',
        }
      ),
    azure: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.azure',
        {
          defaultMessage:
            'Elastic signs in through an app registration you grant read access. No keys are stored.',
        }
      ),
  } satisfies Record<DataSourceType, () => string>,

  storedCredentialsDescription: {
    s3: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.accessAndSecretKeysDescription.s3',
        {
          defaultMessage:
            'Elastic stores an access key and secret key. Rotating them breaks the connection until you update it.',
        }
      ),
    gcs: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.accessAndSecretKeysDescription.gcs',
        {
          defaultMessage: 'Elastic stores a service account key that can read your bucket. Rotating it breaks the connection until you update it.',
        }
      ),
    azure: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.credentialsDescription.azure',
        {
          defaultMessage:
            'Elastic stores your storage account name and access key. Rotating the key breaks the connection until you update it.',
        }
      ),
  } satisfies Record<DataSourceType, () => string>,

  anonymousDescription: {
    s3: () =>
      i18n.translate('xpack.dataFederation.createFlyout.authentication.anonymousDescription.s3', {
        defaultMessage:
          'No credentials are stored. Your S3 bucket must allow anonymous public read access.',
      }),
    gcs: () =>
      i18n.translate('xpack.dataFederation.createFlyout.authentication.anonymousDescription.gcs', {
        defaultMessage:
          'No credentials are stored. Your GCS bucket must allow anonymous public read access.',
      }),
    azure: () =>
      i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.anonymousDescription.azure',
        {
          defaultMessage:
            'No credentials are stored. Your storage account must allow anonymous public blob read access.',
        }
      ),
  } satisfies Record<DataSourceType, () => string>,
};
