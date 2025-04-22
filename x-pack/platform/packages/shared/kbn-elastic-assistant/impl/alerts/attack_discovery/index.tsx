/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
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
  // TODO use alert id for attack discovery
  id?: string;
}

export const AttackDiscoveryWidget = memo(({ id }: Props) => {
  const { http, toasts, navigateToApp } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  // TODO fetch by alert id, not connector id. Waiting for Andrew's API updates
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
          <EuiSpacer size="xs" />
          <AttackDiscoveryDetails attackDiscovery={attackDiscovery} />
          <EuiButtonEmpty
            iconSide="right"
            iconType="popout"
            data-test-subj="attackDiscoveryViewDetails"
            onClick={handleNavigateToAttackDiscovery}
            css={css`
              padding: 0;
            `}
          >
            {i18n.VIEW_DETAILS}
          </EuiButtonEmpty>
        </EuiPanel>
      ) : (
        <EuiPanel
          css={css`
            margin: ${euiTheme.size.s} 0;
          `}
          paddingSize="m"
          hasBorder
        >
          <EuiPanel color="subdued" hasBorder={true}>
            <EuiText size="s">
              <p>{i18n.NO_RESULTS}</p>
            </EuiText>
          </EuiPanel>
        </EuiPanel>
      )}
    </>
  );
});

AttackDiscoveryWidget.displayName = 'AttackDiscoveryWidget';
