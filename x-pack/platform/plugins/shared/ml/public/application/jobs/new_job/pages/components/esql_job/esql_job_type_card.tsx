/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkCard } from '../../../../../components/link_card';
import { getIsMlEsqlDatafeedEnabled } from '../../../../../services/ml_server_info';

export const EsqlJobTypeCard: FC<{ onClick: () => void }> = ({ onClick }) => {
  if (!getIsMlEsqlDatafeedEnabled()) {
    return null;
  }

  return (
    <EuiFlexItem>
      <LinkCard
        data-test-subj="mlJobTypeLinkEsqlJob"
        onClick={onClick}
        icon="esqlVis"
        iconAreaLabel={i18n.translate('xpack.ml.newJob.wizard.jobType.esqlAriaLabel', {
          defaultMessage: 'ES|QL job',
        })}
        title={i18n.translate('xpack.ml.newJob.wizard.jobType.esqlTitle', {
          defaultMessage: 'ES|QL',
        })}
        description={i18n.translate('xpack.ml.newJob.wizard.jobType.esqlDescription', {
          defaultMessage: 'Create an anomaly detection job with an ES|QL query.',
        })}
      />
    </EuiFlexItem>
  );
};
