/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../services/ml_api_service';


export async function deleteFilterLists(filterListsToDelete) {
  if (filterListsToDelete === undefined || filterListsToDelete.length === 0) {
    return;
  }

  // Delete each of the specified filter lists in turn, waiting for each response
  // before deleting the next to minimize load on the cluster.
  toastNotifications.add(i18n.translate('xpack.ml.settings.filterLists.deleteFilterLists.deletingNotificationMessage', {
    defaultMessage: 'Deleting {filterListsToDeleteLength, plural, one {{filterListToDeleteId}} other {# filter lists}}',
    values: {
      filterListsToDeleteLength: filterListsToDelete.length,
      filterListToDeleteId: !!filterListsToDelete.length && filterListsToDelete[0].filter_id,
    }
  }));

  for(const filterList of filterListsToDelete) {
    const filterId = filterList.filter_id;
    try {
      await ml.filters.deleteFilter(filterId);
    } catch (resp) {
      console.log('Error deleting filter list:', resp);
      toastNotifications.addDanger(i18n.translate('xpack.ml.settings.filterLists.deleteFilterLists.deletingErrorMessage', {
        defaultMessage: 'An error occurred deleting filter list {filterListId}{respMessage}',
        values: {
          filterListId: filterList.filter_id,
          respMessage: resp.message ? ` : ${resp.message}` : '',
        }
      }));
    }
  }

  toastNotifications.addSuccess(
    i18n.translate('xpack.ml.settings.filterLists.deleteFilterLists.filtersSuccessfullyDeletedNotificationMessage', {
      defaultMessage: '{filterListsToDeleteLength, plural, one {{filterListToDeleteId}} other {# filter lists}} deleted',
      values: {
        filterListsToDeleteLength: filterListsToDelete.length,
        filterListToDeleteId: !!filterListsToDelete.length && filterListsToDelete[0].filter_id,
      }
    }));
}
