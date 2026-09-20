/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export const federatedIdentityManualSetupStrings = {
  defaultAnnotation: () =>
    i18n.translate(
      'xpack.dataFederation.createFlyout.federated.manual.codeBlock.defaultAnnotation',
      {
        defaultMessage: 'Replace this placeholder with your own value before running the command.',
      }
    ),

  jwtIssuerAnnotation: () =>
    i18n.translate(
      'xpack.dataFederation.createFlyout.federated.manual.codeBlock.jwtIssuerPrefilledAnnotation',
      {
        defaultMessage:
          "Your deployment's issuer URL, filled in for you. Leave this value unchanged, otherwise your cloud provider cannot verify the token Elasticsearch presents.",
      }
    ),

  subjectAnnotation: () =>
    i18n.translate(
      'xpack.dataFederation.createFlyout.federated.manual.codeBlock.subjectPrefilledAnnotation',
      {
        defaultMessage:
          'Your deployment ID, filled in for you. Leave this value unchanged, otherwise the trust policy will not match your deployment.',
      }
    ),

  bucketAnnotation: () =>
    i18n.translate(
      'xpack.dataFederation.createFlyout.federated.manual.codeBlock.bucketAnnotation',
      {
        defaultMessage:
          'Replace with the name of the bucket that holds the data you want to query from Elastic. Read access is granted to this bucket only, so repeat these steps for any other bucket you need.',
      }
    ),

  roleNameAnnotation: () =>
    i18n.translate(
      'xpack.dataFederation.createFlyout.federated.manual.codeBlock.roleNameAnnotation',
      {
        defaultMessage:
          'Replace with a name for the IAM role Elasticsearch assumes, for example elastic-data-federation. A role with this name must not already exist in your AWS account.',
      }
    ),
};
