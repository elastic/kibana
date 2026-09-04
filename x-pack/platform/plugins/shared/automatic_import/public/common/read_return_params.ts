/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function readReturnParams(
  search: string
): { returnAppId: string; returnPath: string } | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const returnAppId = params.get('returnAppId');
  const returnPath = params.get('returnPath');
  if (!returnAppId || !returnPath) {
    return undefined;
  }
  return { returnAppId, returnPath };
}

export function getCreateBackLinkLabel(): string {
  return i18n.translate('xpack.automaticImport.integrationManagement.backToSelectionLinkText', {
    defaultMessage: 'Back to selection',
  });
}

export function shouldShowCreateBackLink({
  returnParams,
  integrationId,
}: {
  returnParams: { returnAppId: string; returnPath: string } | undefined;
  integrationId: string | undefined;
}): boolean {
  return returnParams?.returnAppId === 'observabilityOnboarding' && !integrationId;
}
