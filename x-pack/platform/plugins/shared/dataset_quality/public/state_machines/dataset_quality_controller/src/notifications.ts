/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataStreamType } from '../../../../common/types';

export const fetchDatasetTypesPrivilegesFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetTypesPrivilegesFailed', {
      defaultMessage: "We couldn't get your data set types privileges.",
    }),
    text: error.message,
  });
};

export const fetchDatasetStatsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetStatsFailed', {
      defaultMessage: "We couldn't get your data sets.",
    }),
    text: error.message,
  });
};

export const fetchDegradedStatsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDegradedStatsFailed', {
      defaultMessage: "We couldn't get your degraded docs information.",
    }),
    text: error.message,
  });
};

export const fetchTotalDocsFailedNotifier = (toasts: IToasts, error: Error, meta: any) => {
  const dataStreamType = meta._event.origin as DataStreamType;

  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchTotalDocsFailed', {
      defaultMessage: "We couldn't get total docs information for {dataStreamType}.",
      values: { dataStreamType },
    }),
    text: error.message,
  });
};

export const fetchIntegrationsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchIntegrationsFailed', {
      defaultMessage: "We couldn't get your integrations.",
    }),
    text: error.message,
  });
};

export const fetchFailedStatsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchFailedStatsFailed', {
      defaultMessage: "We couldn't get your failed docs information.",
    }),
    text: error.message,
  });
};

export const updateFailureStoreFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.updateFailureStoreFailed', {
      defaultMessage: "We couldn't update the failure store settings.",
    }),
    text: error.message,
  });
};

export const updateFailureStoreSuccessNotifier = (toasts: IToasts) => {
  toasts.addSuccess({
    title: i18n.translate('xpack.datasetQuality.updateFailureStoreSuccess', {
      defaultMessage: 'Failure store settings saved',
    }),
  });
};
