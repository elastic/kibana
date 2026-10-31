/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiText, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AccessDraftEditor,
  useAccessControlApi,
  type AccessDraft,
  type AccessPolicyResponse,
} from '@kbn/access-control-ui';
import { useKibana } from '../../../../common/lib/kibana';
import { CONNECTOR_ACCESS_COPY } from './connector_access_copy';

export interface ConnectorAccessSectionProps {
  policy: AccessPolicyResponse;
  value: AccessDraft;
  onChange: (value: AccessDraft) => void;
  isDisabled?: boolean;
}

/**
 * Sets who can access a connector while creating it. The connector is created with this access in
 * the same request, so it is never visible to others in the meantime.
 */
export const ConnectorAccessSection = ({
  policy,
  value,
  onChange,
  isDisabled,
}: ConnectorAccessSectionProps) => {
  const { http } = useKibana().services;
  const api = useAccessControlApi(http);
  const accordionId = useGeneratedHtmlId({ prefix: 'connectorAccess' });
  const suggestPrincipals = useCallback(
    (name: string, signal: AbortSignal) => api.suggest('action', name, signal),
    [api]
  );

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="connectorAccessSection"
      buttonContent={
        <>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.triggersActionsUI.connectorAccess.section.title', {
                defaultMessage: 'Access',
              })}
            </h4>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {CONNECTOR_ACCESS_COPY.generalAccess[value.general_access]?.label}
            {value.entries.length > 0
              ? i18n.translate('xpack.triggersActionsUI.connectorAccess.section.entries', {
                  defaultMessage: ', {count, plural, one {# more person} other {# more people}}',
                  values: { count: value.entries.length },
                })
              : null}
          </EuiText>
        </>
      }
      paddingSize="m"
    >
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.triggersActionsUI.connectorAccess.section.description', {
          defaultMessage:
            'You will be the owner of this connector and can change its access later.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <AccessDraftEditor
        policy={policy}
        value={value}
        onChange={onChange}
        suggestPrincipals={suggestPrincipals}
        copy={CONNECTOR_ACCESS_COPY}
        isDisabled={isDisabled}
      />
    </EuiAccordion>
  );
};
