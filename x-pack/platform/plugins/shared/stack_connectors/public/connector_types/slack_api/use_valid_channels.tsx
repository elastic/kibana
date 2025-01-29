/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { ValidChannelRouteResponse } from '../../../common/slack_api/types';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';
import * as i18n from './translations';

interface UseValidChannelsProps {
  authToken: string;
  channelId: string;
}

const validChannelIds = async (
  http: HttpSetup,
  newAuthToken: string,
  channelId: string
): Promise<ValidChannelRouteResponse> => {
  return http.post<ValidChannelRouteResponse>(
    `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels/_valid`,
    {
      body: JSON.stringify({
        authToken: newAuthToken,
        channelIds: [channelId],
      }),
    }
  );
};

export function useValidChannels(props: UseValidChannelsProps) {
  const { authToken, channelId } = props;
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const channelIdToValidate = channels.some((c: { id: string }) => c.id === channelId)
    ? ''
    : channelId;
  const queryFn = () => {
    return validChannelIds(http, authToken, channelIdToValidate);
  };

  const onErrorFn = () => {
    toasts.addDanger(i18n.ERROR_VALID_CHANNELS);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['validChannels', authToken, channelIdToValidate],
    queryFn,
    onError: onErrorFn,
    enabled: (authToken || '').length > 0 && (channelIdToValidate || '').length > 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if ((data?.invalidChannels ?? []).length > 0) {
      toasts.addDanger(i18n.ERROR_INVALID_CHANNELS(data?.invalidChannels ?? []));
    }
    if ((data?.validChannels ?? []).length > 0) {
      setChannels((prevChannels) => {
        return prevChannels.concat(data?.validChannels ?? []);
      });
    }
  }, [data, toasts]);

  const resetChannelsToValidate = useCallback(
    (channelsToReset: Array<{ id: string; name: string }>) => {
      if (channelsToReset.length === 0) {
        setChannels([]);
      } else {
        setChannels((prevChannels) => {
          if (prevChannels.length === 0) return channelsToReset;
          return prevChannels.filter((c) => channelsToReset.some((cTr) => cTr.id === c.id));
        });
      }
    },
    []
  );

  return {
    channels,
    resetChannelsToValidate,
    isLoading: isLoading && isFetching,
  };
}
