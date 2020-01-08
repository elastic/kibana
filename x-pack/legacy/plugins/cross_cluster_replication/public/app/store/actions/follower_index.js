/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import routing from '../../services/routing';
import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadFollowerIndices as loadFollowerIndicesRequest,
  getFollowerIndex as getFollowerIndexRequest,
  createFollowerIndex as createFollowerIndexRequest,
  pauseFollowerIndex as pauseFollowerIndexRequest,
  resumeFollowerIndex as resumeFollowerIndexRequest,
  unfollowLeaderIndex as unfollowLeaderIndexRequest,
  updateFollowerIndex as updateFollowerIndexRequest,
} from '../../services/api';
import * as t from '../action_types';
import { sendApiRequest } from './api';
import { getSelectedFollowerIndexId } from '../selectors';

const { FOLLOWER_INDEX: scope } = SECTIONS;

export const selectDetailFollowerIndex = id => ({
  type: t.FOLLOWER_INDEX_SELECT_DETAIL,
  payload: id,
});

export const selectEditFollowerIndex = id => ({
  type: t.FOLLOWER_INDEX_SELECT_EDIT,
  payload: id,
});

export const loadFollowerIndices = (isUpdating = false) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => await loadFollowerIndicesRequest(),
  });

export const getFollowerIndex = id =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_GET,
    scope: `${scope}-get`,
    handler: async () => await getFollowerIndexRequest(id),
  });

export const saveFollowerIndex = (name, followerIndex, isUpdating = false) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_CREATE,
    status: API_STATUS.SAVING,
    scope: `${scope}-save`,
    handler: async () => {
      if (isUpdating) {
        return await updateFollowerIndexRequest(name, followerIndex);
      }
      return await createFollowerIndexRequest({ name, ...followerIndex });
    },
    onSuccess() {
      const successMessage = isUpdating
        ? i18n.translate(
            'xpack.crossClusterReplication.followerIndex.updateAction.successNotificationTitle',
            {
              defaultMessage: `Follower index '{name}' updated successfully`,
              values: { name },
            }
          )
        : i18n.translate(
            'xpack.crossClusterReplication.followerIndex.addAction.successNotificationTitle',
            {
              defaultMessage: `Added follower index '{name}'`,
              values: { name },
            }
          );

      toastNotifications.addSuccess(successMessage);
      routing.navigate(`/follower_indices`, undefined, {
        name: encodeURIComponent(name),
      });
    },
  });

export const pauseFollowerIndex = id =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_PAUSE,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => pauseFollowerIndexRequest(id),
    onSuccess(response, dispatch) {
      /**
       * We can have 1 or more follower index pause operation
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.pauseAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error pausing {count} follower indices`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.pauseAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error pausing follower index '{name}'`,
                values: { name: response.errors[0].id },
              }
            );

        toastNotifications.addDanger(errorMessage);
      }

      if (response.itemsPaused.length) {
        const hasMultiplePaused = response.itemsPaused.length > 1;

        const successMessage = hasMultiplePaused
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.pauseAction.successMultipleNotificationTitle',
              {
                defaultMessage: `{count} follower indices were paused`,
                values: { count: response.itemsPaused.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.pauseAction.successSingleNotificationTitle',
              {
                defaultMessage: `Follower index '{name}' was paused`,
                values: { name: response.itemsPaused[0] },
              }
            );

        toastNotifications.addSuccess(successMessage);

        // Refresh list
        dispatch(loadFollowerIndices(true));
      }
    },
  });

export const resumeFollowerIndex = id =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_RESUME,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => resumeFollowerIndexRequest(id),
    onSuccess(response, dispatch) {
      /**
       * We can have 1 or more follower index resume operation
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.resumeAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error resuming {count} follower indices`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.resumeAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error resuming follower index '{name}'`,
                values: { name: response.errors[0].id },
              }
            );

        toastNotifications.addDanger(errorMessage);
      }

      if (response.itemsResumed.length) {
        const hasMultipleResumed = response.itemsResumed.length > 1;

        const successMessage = hasMultipleResumed
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.resumeAction.successMultipleNotificationTitle',
              {
                defaultMessage: `{count} follower indices were resumed`,
                values: { count: response.itemsResumed.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.resumeAction.successSingleNotificationTitle',
              {
                defaultMessage: `Follower index '{name}' was resumed`,
                values: { name: response.itemsResumed[0] },
              }
            );

        toastNotifications.addSuccess(successMessage);
      }

      // Refresh list
      dispatch(loadFollowerIndices(true));
    },
  });

export const unfollowLeaderIndex = id =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_UNFOLLOW,
    status: API_STATUS.DELETING,
    scope: `${scope}-delete`,
    handler: async () => unfollowLeaderIndexRequest(id),
    onSuccess(response, dispatch, getState) {
      /**
       * We can have 1 or more follower index unfollow operation
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error unfollowing leader index of {count} follower indices`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error unfollowing leader index of follower index '{name}'`,
                values: { name: response.errors[0].id },
              }
            );

        toastNotifications.addDanger(errorMessage);
      }

      if (response.itemsUnfollowed.length) {
        const hasMultipleUnfollow = response.itemsUnfollowed.length > 1;

        const successMessage = hasMultipleUnfollow
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.successMultipleNotificationTitle',
              {
                defaultMessage: `Leader indices of {count} follower indices were unfollowed`,
                values: { count: response.itemsUnfollowed.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.successSingleNotificationTitle',
              {
                defaultMessage: `Leader index of follower index '{name}' was unfollowed`,
                values: { name: response.itemsUnfollowed[0] },
              }
            );

        toastNotifications.addSuccess(successMessage);
      }

      if (response.itemsNotOpen.length) {
        const hasMultipleNotOpen = response.itemsNotOpen.length > 1;

        const warningMessage = hasMultipleNotOpen
          ? i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.notOpenWarningMultipleNotificationTitle',
              {
                defaultMessage: `{count} indices could not be re-opened`,
                values: { count: response.itemsNotOpen.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.followerIndex.unfollowAction.notOpenWarningSingleNotificationTitle',
              {
                defaultMessage: `Index '{name}' could not be re-opened`,
                values: { name: response.itemsNotOpen[0] },
              }
            );

        toastNotifications.addWarning(warningMessage);
      }

      // If we've just unfollowed a follower index we were looking at, we need to close the panel.
      const followerIndexId = getSelectedFollowerIndexId('detail')(getState());
      if (response.itemsUnfollowed.includes(followerIndexId)) {
        dispatch(selectDetailFollowerIndex(null));
      }
    },
  });
