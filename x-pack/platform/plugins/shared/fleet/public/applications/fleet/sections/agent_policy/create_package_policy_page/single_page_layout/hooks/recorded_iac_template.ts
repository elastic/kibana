/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnabledInputsByPolicyTemplate } from '../../../../../../../../common/services';
import type { NewPackagePolicy } from '../../../../../types';
import type {
  IacRenderedTemplate,
  IacTemplateLaunchedFor,
} from '../../../../../../../components/cloud_connector/components/iac_key_check';
import {
  sendUpdateCloudConnector,
  sendVerifyCloudConnectorIacKey,
} from '../../../../../../../hooks/use_request/cloud_connector';

/** The integration set the shared AWS setup renders and checks templates for. */
export const getIdentityFederationIntegrations = (
  packageName: string,
  inputs: NewPackagePolicy['inputs']
) => [{ name: packageName, policyTemplates: getEnabledInputsByPolicyTemplate({ inputs }) }];

/** Template details from an Existing Identity stack-update launch, tagged with what it was for. */
export type RecordedIacTemplate = IacRenderedTemplate & {
  cloudConnectorId: string;
  integrationsKey: string;
};

export const toRecordedIacTemplate = (
  iac: IacRenderedTemplate,
  launchedFor: IacTemplateLaunchedFor
): RecordedIacTemplate => ({
  ...iac,
  cloudConnectorId: launchedFor.cloudConnectorId,
  integrationsKey: JSON.stringify(launchedFor.integrations),
});

/**
 * Writes the recorded template details to the identity after the policy saved, but only when the
 * saved policy uses the identity and the enabled inputs the stack update was launched for. A
 * launch the user abandoned, or one for another identity or input set, leaves the identity as it
 * was. Best effort, as in the Ingest Hub onboarding: a failed write is reported through `onError`
 * and never fails the save; the daily upgrade check reconciles the identity.
 */
export const persistRecordedIacTemplate = async ({
  recorded,
  cloudConnectorId,
  integrationsKey,
  onError,
}: {
  recorded: RecordedIacTemplate | undefined;
  cloudConnectorId: string | null | undefined;
  integrationsKey: string;
  onError: (error: Error) => void;
}): Promise<void> => {
  if (
    !recorded ||
    !cloudConnectorId ||
    recorded.cloudConnectorId !== cloudConnectorId ||
    recorded.integrationsKey !== integrationsKey
  ) {
    return;
  }
  const {
    iac_key: iacKey,
    iac_blueprint_id: blueprintId,
    iac_blueprint_version: version,
  } = recorded;
  try {
    const { error } = await sendUpdateCloudConnector(cloudConnectorId, {
      iac_key: iacKey,
      iac_blueprint_id: blueprintId,
      iac_blueprint_version: version,
    });
    if (error) {
      throw error;
    }
  } catch (thrown) {
    onError(thrown instanceof Error ? thrown : new Error(String(thrown)));
    return;
  }
  // With the new key stored the check answers `matches` and the server records `up_to_date`.
  await sendVerifyCloudConnectorIacKey(cloudConnectorId, {}).catch(() => undefined);
};
