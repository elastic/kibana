/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAppContext } from '../app_context';

export const useDoProfile = () => {
  const { http, notifications, formatAngularHttpError } = useAppContext();
  return async (requestBody: any) => {
    try {
      const resp = await http.post('../api/searchprofiler/profile', requestBody);
      if (!resp.data.ok) {
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
        throw new Error(resp.data.err.msg);
      }
      return resp.data.resp.profile.shards;
    } catch (e) {
      notifications.toasts.addDanger(formatAngularHttpError(e));
    }
  };
};
