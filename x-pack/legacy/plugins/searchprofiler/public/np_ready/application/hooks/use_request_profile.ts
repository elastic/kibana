/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../contexts/app_context';
import { checkForParseErrors } from '../utils';
import { ShardSerialized } from '../types';

interface Args {
  query: string;
  index: string;
}

interface ReturnValue {
  data: ShardSerialized[] | null;
  error?: string;
}

export const useRequestProfile = () => {
  const { http, notifications, formatAngularHttpError, licenseEnabled } = useAppContext();
  return async ({ query, index }: Args): Promise<ReturnValue> => {
    if (!licenseEnabled) {
      return { data: null };
    }
    const { error, parsed } = checkForParseErrors(query);
    if (error) {
      notifications.addError(error, {
        title: i18n.translate('xpack.searchProfiler.errorToastTitle', {
          defaultMessage: 'JSON parse error',
        }),
      });
      return { data: null };
    }
    // Shortcut the network request if we have json with shards already...
    if (parsed.profile && parsed.profile.shards) {
      return { data: parsed.profile.shards };
    }

    const payload: Record<string, any> = { query };

    if (index == null || index === '') {
      payload.index = '_all';
    } else {
      payload.index = index;
    }

    try {
      const resp = await http.post('../api/searchprofiler/profile', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        return { data: null, error: resp.err.msg };
      }

      return { data: resp.resp.profile.shards };
    } catch (e) {
      try {
        // Is this a known error type?
        const errorString = formatAngularHttpError(e);
        notifications.addError(e, { title: errorString });
      } catch (_) {
        // Otherwise just report the original error
        notifications.addError(e, {
          title: i18n.translate('xpack.searchProfiler.errorSomethingWentWrongTitle', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
      return { data: null };
    }
  };
};
