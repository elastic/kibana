/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiAutoRefreshButton } from '@elastic/eui';
import { OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';

interface RulesListAutoRefreshProps {
  lastUpdate: string;
  initialUpdateInterval?: number;
  onRefresh: () => void;
}

const flexGroupStyle = {
  marginLeft: 'auto',
};

const getLastUpdateText = (lastUpdate: string) => {
  if (!moment(lastUpdate).isValid()) {
    return '';
  }
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListAutoRefresh.lastUpdateText',
    {
      defaultMessage: 'Updated {lastUpdateText}',
      values: {
        lastUpdateText: moment(lastUpdate).locale(i18n.getLocale()).fromNow(),
      },
    }
  );
};

const TEXT_UPDATE_INTERVAL = 60 * 1000;
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;
const MIN_REFRESH_INTERVAL = 1000;

export const RulesListAutoRefresh = (props: RulesListAutoRefreshProps) => {
  const { lastUpdate, initialUpdateInterval = DEFAULT_REFRESH_INTERVAL, onRefresh } = props;

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(
    Math.max(initialUpdateInterval, MIN_REFRESH_INTERVAL)
  );
  const [lastUpdateText, setLastUpdateText] = useState<string>('');

  const cachedOnRefresh = useRef<() => void>(() => {});
  const textUpdateTimeout = useRef<number | undefined>();
  const refreshTimeout = useRef<number | undefined>();

  useEffect(() => {
    cachedOnRefresh.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    setLastUpdateText(getLastUpdateText(lastUpdate));

    const poll = () => {
      textUpdateTimeout.current = window.setTimeout(() => {
        setLastUpdateText(getLastUpdateText(lastUpdate));
        poll();
      }, TEXT_UPDATE_INTERVAL);
    };
    poll();

    return () => {
      if (textUpdateTimeout.current) {
        clearTimeout(textUpdateTimeout.current);
      }
    };
  }, [lastUpdate, setLastUpdateText]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const poll = () => {
      refreshTimeout.current = window.setTimeout(() => {
        cachedOnRefresh.current();
        poll();
      }, refreshInterval);
    };
    poll();

    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, [isPaused, refreshInterval]);

  const onRefreshChange = useCallback(
    ({ isPaused: newIsPaused, refreshInterval: newRefreshInterval }: OnRefreshChangeProps) => {
      setIsPaused(newIsPaused);
      setRefreshInterval(newRefreshInterval);
    },
    [setIsPaused, setRefreshInterval]
  );

  return (
    <EuiFlexGroup data-test-subj="rulesListAutoRefresh" alignItems="center">
      <EuiFlexItem grow={false} style={flexGroupStyle}>
        <EuiText data-test-subj="rulesListAutoRefresh-lastUpdateText" size="s" color="subdued">
          {lastUpdateText}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAutoRefreshButton
          isPaused={isPaused}
          shortHand
          refreshInterval={refreshInterval}
          onRefreshChange={onRefreshChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
