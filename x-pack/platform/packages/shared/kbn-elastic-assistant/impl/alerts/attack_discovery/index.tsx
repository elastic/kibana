/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useAssistantContext } from '../../assistant_context';
import { AttackDiscoveryDetails } from './attack_discovery_details';
import { useFetchAttackDiscovery } from './use_fetch_attack_discovery';
import * as i18n from './translations';

interface Props {
  id?: string;
}
export const AttackDiscoveryWidget: React.FC<Props> = ({ id }) => {
  const { http, toasts, navigateToApp } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  // TODO get connector id from configured LLM
  const connectorId = 'my-gpt4o-ai';
  const { isFetching, data } = useFetchAttackDiscovery({ connectorId, http, toasts });
  const [attackDiscovery, setAttackDiscovery] = useState<AttackDiscovery | null>(null);
  const handleNavigateToAttackDiscovery = useCallback(
    () =>
      navigateToApp('security', {
        path: 'attack_discovery',
      }),
    [navigateToApp]
  );
  useEffect(() => {
    if (data != null) {
      setAttackDiscovery(data);
    }
  }, [data]);

  return (
    <>
      <EuiTitle size={'s'} data-test-subj="knowledge-base-settings">
        <h2>{i18n.ATTACK_DISCOVERY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      {isFetching ? (
        <EuiLoadingSpinner />
      ) : attackDiscovery ? (
        <EuiPanel
          css={css`
            margin: ${euiTheme.size.s} 0;
          `}
          paddingSize="m"
          hasBorder
        >
          <EuiText color="subdued" size="s">
            <p>{i18n.ALERT_PART}</p>
          </EuiText>
          <EuiTitle size="xs">
            <h3>{attackDiscovery.title}</h3>
          </EuiTitle>
          <AttackDiscoveryDetails attackDiscovery={attackDiscovery} />
          <EuiButtonEmpty
            iconSide="right"
            iconType="popout"
            onClick={handleNavigateToAttackDiscovery}
            css={css`
              padding: 0;
            `}
          >
            {i18n.VIEW_DETAILS}
          </EuiButtonEmpty>
        </EuiPanel>
      ) : (
        'No attack discovery exists'
      )}
    </>
  );
};
