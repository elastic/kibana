/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../app_context';
import { checkForParseErrors } from '../utils';
import { ShardSerialized } from '../types';

interface Args {
  query: string;
  index: string;
  type: string;
}

export const useDoProfile = () => {
  const { http, notifications, formatAngularHttpError, licenseEnabled } = useAppContext();
  return async ({ query, index, type }: Args): Promise<ShardSerialized[] | null> => {
    if (!licenseEnabled) {
      return null;
    }
    const { error, parsed } = checkForParseErrors(query);
    if (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.searchProfiler.errorToastTitle', {
          defaultMessage: 'JSON parse error',
        }),
      });
      return null;
    }
    // Shortcut the network request if we have json with shards already...
    if (parsed.profile && parsed.profile.shards) {
      return parsed.profile.shards;
    }

    const payload: Record<string, any> = { query };

    if (index == null || index === '') {
      payload.index = '_all';
    } else {
      payload.index = index;
    }

    if (type != null && type !== '') {
      payload.type = type;
    }

    try {
      const resp = await http.post('../api/searchprofiler/profile', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        notifications.toasts.addDanger(resp.data.err.msg);
        // TODO: Get this error feedback working again
        // try {
        // const regex = /line=([0-9]+) col=([0-9]+)/g;
        // const [, row, column] = regex.exec(resp.data.err.msg);
        //
        // $scope.markers.push($scope.ace.session.addMarker(
        //   new Range(row - 1, 0, row - 1, column), 'errorMarker', 'fullLine'));
        // } catch (e) {
        // Best attempt, not a big deal if we can't highlight the line
        // }
        return null;
      }
      return resp.resp.profile.shards;
    } catch (e) {
      try {
        // Is this a known error type?
        const errorString = formatAngularHttpError(e);
        notifications.toasts.addError(e, { title: errorString });
      } catch (_) {
        // Otherwise just report the original error
        notifications.toasts.addError(e, {
          title: i18n.translate('xpack.searchProfiler.errorSomethingWentWrongTitle', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
      return null;
    }
  };
};
