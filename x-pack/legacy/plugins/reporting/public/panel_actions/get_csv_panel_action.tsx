/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';

import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import chrome from 'ui/chrome';

import { npSetup } from 'ui/new_platform';
import { IAction, IncompatibleActionError } from '../../../../../../src/plugins/ui_actions/public';

import {
  ViewMode,
  IEmbeddable,
  CONTEXT_MENU_TRIGGER,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/constants';
import { ISearchEmbeddable } from '../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/types';

import { API_BASE_URL_V1 } from '../../common/constants';

const API_BASE_URL = `${API_BASE_URL_V1}/generate/immediate/csv/saved-object`;

const CSV_REPORTING_ACTION = 'downloadCsvReport';

function isSavedSearchEmbeddable(
  embeddable: IEmbeddable | ISearchEmbeddable
): embeddable is ISearchEmbeddable {
  return embeddable.type === SEARCH_EMBEDDABLE_TYPE;
}

interface ActionContext {
  embeddable: ISearchEmbeddable;
}

class GetCsvReportPanelAction implements IAction<ActionContext> {
  private isDownloading: boolean;
  public readonly type = CSV_REPORTING_ACTION;
  public readonly id = CSV_REPORTING_ACTION;

  constructor() {
    this.isDownloading = false;
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return i18n.translate('xpack.reporting.dashboard.downloadCsvPanelTitle', {
      defaultMessage: 'Download CSV',
    });
  }

  public async getSearchRequestBody({ searchEmbeddable }: { searchEmbeddable: any }) {
    const adapters = searchEmbeddable.getInspectorAdapters();
    if (!adapters) {
      return {};
    }

    if (adapters.requests.requests.length === 0) {
      return {};
    }

    return searchEmbeddable.getSavedSearch().searchSource.getSearchRequestBody();
  }

  public isCompatible = async (context: ActionContext) => {
    const enablePanelActionDownload = chrome.getInjected('enablePanelActionDownload');

    if (!enablePanelActionDownload) {
      return false;
    }

    const { embeddable } = context;

    return embeddable.getInput().viewMode !== ViewMode.EDIT && embeddable.type === 'search';
  };

  public execute = async (context: ActionContext) => {
    const { embeddable } = context;

    if (!isSavedSearchEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }

    if (this.isDownloading) {
      return;
    }

    const {
      timeRange: { to, from },
    } = embeddable.getInput();

    const searchEmbeddable = embeddable;
    const searchRequestBody = await this.getSearchRequestBody({ searchEmbeddable });
    const state = _.pick(searchRequestBody, ['sort', 'docvalue_fields', 'query']);
    const kibanaTimezone = chrome.getUiSettingsClient().get('dateFormat:tz');

    const id = `search:${embeddable.getSavedSearch().id}`;
    const filename = embeddable.getTitle();
    const timezone = kibanaTimezone === 'Browser' ? moment.tz.guess() : kibanaTimezone;
    const fromTime = dateMath.parse(from);
    const toTime = dateMath.parse(to);

    if (!fromTime || !toTime) {
      return this.onGenerationFail(
        new Error(`Invalid time range: From: ${fromTime}, To: ${toTime}`)
      );
    }

    const body = JSON.stringify({
      timerange: {
        min: fromTime.format(),
        max: toTime.format(),
        timezone,
      },
      state,
    });

    this.isDownloading = true;

    toastNotifications.addSuccess({
      title: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedTitle', {
        defaultMessage: `CSV Download Started`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedMessage', {
        defaultMessage: `Your CSV will download momentarily.`,
      }),
      'data-test-subj': 'csvDownloadStarted',
    });

    await kfetch({ method: 'POST', pathname: `${API_BASE_URL}/${id}`, body })
      .then((rawResponse: string) => {
        this.isDownloading = false;

        const download = `${filename}.csv`;
        const blob = new Blob([rawResponse], { type: 'text/csv;charset=utf-8;' });

        // Hack for IE11 Support
        if (window.navigator.msSaveOrOpenBlob) {
          return window.navigator.msSaveOrOpenBlob(blob, download);
        }

        const a = window.document.createElement('a');
        const downloadObject = window.URL.createObjectURL(blob);

        a.href = downloadObject;
        a.download = download;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadObject);
        document.body.removeChild(a);
      })
      .catch(this.onGenerationFail.bind(this));
  };

  private onGenerationFail(error: Error) {
    this.isDownloading = false;
    toastNotifications.addDanger({
      title: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadTitle', {
        defaultMessage: `CSV download failed`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadMessage', {
        defaultMessage: `We couldn't generate your CSV at this time.`,
      }),
      'data-test-subj': 'downloadCsvFail',
    });
  }
}

const action = new GetCsvReportPanelAction();
npSetup.plugins.uiActions.registerAction(action);
npSetup.plugins.uiActions.attachAction(CONTEXT_MENU_TRIGGER, action.id);
