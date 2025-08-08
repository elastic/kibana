/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { ILM_POLICY_NAME } from '@kbn/reporting-common';

import { LocatorPublic, SerializableRecord } from '../../shared_imports';

interface Props {
  locator: LocatorPublic<SerializableRecord>;
}

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.reporting.listing.reports.ilmPolicyLinkText', {
    defaultMessage: 'Edit ILM policy',
  }),
};

export const IlmPolicyLink: FunctionComponent<Props> = ({ locator }) => {
  return (
    <EuiButtonEmpty
      data-test-subj="ilmPolicyLink"
      size="s"
      iconType="popout"
      onClick={() => {
        const url = locator.getRedirectUrl({
          page: 'policy_edit',
          policyName: ILM_POLICY_NAME,
        });
        window.open(url, '_blank');
        window.focus();
      }}
    >
      {i18nTexts.buttonLabel}
    </EuiButtonEmpty>
  );
};
