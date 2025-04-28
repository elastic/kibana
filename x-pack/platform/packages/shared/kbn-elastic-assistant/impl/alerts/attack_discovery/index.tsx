/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
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
import { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useAssistantContext } from '../../assistant_context';
import { AttackDiscoveryDetails } from './attack_discovery_details';
import { useFindAttackDiscoveries } from './use_find_attack_discoveries';
import * as i18n from './translations';

interface Props {
  id: string;
}

export const AttackDiscoveryWidget = memo(({ id }: Props) => {
  const { assistantAvailability, http, navigateToApp } = useAssistantContext();
  const { euiTheme } = useEuiTheme();

  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading, data } = useFindAttackDiscoveries({
    alertIds: [id],
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
  });
  const [attackDiscovery, setAttackDiscovery] = useState<AttackDiscoveryAlert | null>(null);
  const handleNavigateToAttackDiscovery = useCallback(
    (attackDiscoveryId: string) => {
      if (pathname.includes('attack_discovery')) {
        searchParams.set('id', attackDiscoveryId);
        setSearchParams(searchParams);
      } else {
        navigateToApp('security', {
          path: `attack_discovery?id=${attackDiscoveryId}`,
        });
      }
    },
    [pathname, searchParams, setSearchParams, navigateToApp]
  );
  useEffect(() => {
    if (data != null && data.data.length > 0) {
      setAttackDiscovery(data.data[0]);
    }
  }, [data]);

  return (
    <>
      {isLoading ? (
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
            onClick={() => handleNavigateToAttackDiscovery(attackDiscovery.id)}
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
