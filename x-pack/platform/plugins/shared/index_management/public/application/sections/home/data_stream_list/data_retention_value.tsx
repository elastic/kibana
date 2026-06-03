/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DataStream } from '../../../../../common/types';
import { ILM_PAGES_POLICY_EDIT } from '../../../constants';
import { useAppContext } from '../../../app_context';
import { useIlmLocator } from '../../../services/use_ilm_locator';
import { getLifecycleValue, isNextGenIlm } from '../../../lib/data_streams';

export const DataRetentionValue = ({
  dataStream,
  infiniteAsIcon,
  valueTestSubj,
}: {
  dataStream: DataStream;
  infiniteAsIcon?: boolean;
  valueTestSubj?: string;
}) => {
  const { core } = useAppContext();

  const ilmPolicyName = dataStream.ilmPolicyName;
  const ilmPolicyLink = useIlmLocator(ILM_PAGES_POLICY_EDIT, ilmPolicyName);

  if (isNextGenIlm(dataStream) && ilmPolicyName) {
    const ilmLabel = i18n.translate('xpack.idxMgmt.dataStreamList.dataRetention.ilmBadgeLabel', {
      defaultMessage: 'ILM',
    });

    return (
      <>
        {ilmPolicyLink ? (
          <EuiLink
            data-test-subj={valueTestSubj}
            data-href={ilmPolicyLink}
            onClick={() => core.application.navigateToUrl(ilmPolicyLink)}
            css={{
              whiteSpace: 'nowrap' as const,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              maxWidth: '150px',
              display: 'inline-block',
              verticalAlign: 'middle',
            }}
            aria-label={i18n.translate(
              'xpack.idxMgmt.dataStreamList.dataRetention.ilmLinkAriaLabel',
              {
                defaultMessage: 'ILM policy: {name}',
                values: { name: ilmPolicyName },
              }
            )}
          >
            {ilmPolicyName}
          </EuiLink>
        ) : (
          <span data-test-subj={valueTestSubj}>{ilmPolicyName}</span>
        )}{' '}
        <EuiBadge color="hollow">{ilmLabel}</EuiBadge>
      </>
    );
  }

  return <>{getLifecycleValue(dataStream.lifecycle, infiniteAsIcon)}</>;
};
