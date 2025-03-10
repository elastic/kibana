/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';

export const RulesListDocLink = () => {
  const { docLinks } = useKibana().services;

  return (
    <EuiButtonEmpty
      href={docLinks.links.alerting.guide}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.home.docsLinkText"
        defaultMessage="Documentation"
      />
    </EuiButtonEmpty>
  );
};
