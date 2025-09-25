/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer, EuiText } from '@elastic/eui';

const loadingMessages = [
  i18n.translate('xpack.streams.streamSystemsFlyout.loading.analyzingDataSet', {
    defaultMessage: 'Gen AI is analyzing your data set …',
  }),
  i18n.translate('xpack.streams.streamSystemsFlyout.loading.analyzingMapping', {
    defaultMessage: 'Analyzing mapping and relationships …',
  }),
  i18n.translate('xpack.streams.streamSystemsFlyout.loading.thinking', {
    defaultMessage: 'Thinking and making sense of your data …',
  }),
  i18n.translate('xpack.streams.streamSystemsFlyout.loading.verifyingSystems', {
    defaultMessage: 'Verifying identified systems …',
  }),
  i18n.translate('xpack.streams.streamSystemsFlyout.loading.pleaseBePatient', {
    defaultMessage: 'This may take a few minutes, please be patient.',
  }),
];

export const StreamSystemsLoading: React.FC = () => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((idx) => (idx + 1) % loadingMessages.length);
    }, 15000); // 15 seconds per message
    return () => clearInterval(interval);
  }, []);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
      <EuiFlexItem grow={false} css={{ textAlign: 'center' }}>
        <EuiLoadingElastic size="xxl" />
        <EuiSpacer size="m" />
        <EuiText>
          <p>{loadingMessages[msgIdx]}</p>
          <p>
            {i18n.translate('xpack.streams.streamSystemsFlyout.loading.standby', {
              defaultMessage: 'Please standby while we identify systems.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
