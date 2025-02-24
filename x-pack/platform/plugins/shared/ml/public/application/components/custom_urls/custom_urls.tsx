/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import type { TimeRange as EsQueryTimeRange } from '@kbn/es-query';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { context } from '@kbn/kibana-react-plugin/public';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { isDataFrameAnalyticsConfigs } from '@kbn/ml-data-frame-analytics-utils';
import type { DashboardService, DashboardItems } from '../../services/dashboard_service';
import type { ToastNotificationService } from '../../services/toast_notification_service';
import { toastNotificationServiceProvider } from '../../services/toast_notification_service';
import type { MlKibanaReactContextValue } from '../../contexts/kibana';
import { CustomUrlEditor, CustomUrlList } from './custom_url_editor';
import {
  getNewCustomUrlDefaults,
  isValidCustomUrlSettings,
  buildCustomUrlFromSettings,
  getTestUrl,
  type CustomUrlSettings,
} from './custom_url_editor/utils';
import { openCustomUrlWindow } from '../../util/custom_url_utils';
import type { CustomUrlsWrapperProps } from './custom_urls_wrapper';
import { indexServiceFactory, type MlIndexUtils } from '../../util/index_service';

interface CustomUrlsState {
  customUrls: MlUrlConfig[];
  dashboards: DashboardItems;
  dataViewListItems: DataViewListItem[];
  editorOpen: boolean;
  editorSettings?: CustomUrlSettings;
  supportedFilterFields: string[];
}
interface CustomUrlsProps extends CustomUrlsWrapperProps {
  currentTimeFilter?: EsQueryTimeRange;
  dashboardService: DashboardService;
  isPartialDFAJob?: boolean;
}

export class CustomUrls extends Component<CustomUrlsProps, CustomUrlsState> {
  static contextType = context;
  declare context: MlKibanaReactContextValue;

  private toastNotificationService: ToastNotificationService;
  private mlIndexUtils: MlIndexUtils;

  constructor(props: CustomUrlsProps, constructorContext: MlKibanaReactContextValue) {
    super(props);

    this.state = {
      customUrls: [],
      dashboards: [],
      dataViewListItems: [],
      editorOpen: false,
      supportedFilterFields: [],
    };

    this.toastNotificationService = toastNotificationServiceProvider(
      constructorContext.services.notifications.toasts
    );
    this.mlIndexUtils = indexServiceFactory(constructorContext.services.data.dataViews);
  }

  static getDerivedStateFromProps(props: CustomUrlsProps) {
    return {
      job: props.job,
      customUrls: props.jobCustomUrls,
    };
  }

  componentDidMount() {
    const { dashboardService } = this.props;

    dashboardService
      .fetchDashboards()
      .then((dashboards) => {
        this.setState({ dashboards });
      })
      .catch((error) => {
        this.toastNotificationService!.displayErrorToast(
          error,
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadSavedDashboardsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved Kibana dashboards',
            }
          )
        );
      });

    this.mlIndexUtils
      .loadDataViewListItems()
      .then((dataViewListItems) => {
        this.setState({ dataViewListItems });
      })
      .catch((error) => {
        this.toastNotificationService!.displayErrorToast(
          error,
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadDataViewsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved data views',
            }
          )
        );
      });
  }

  editNewCustomUrl = () => {
    // Opens the editor for configuring a new custom URL.
    this.setState((prevState) => {
      const { dashboards, dataViewListItems } = prevState;

      return {
        editorOpen: true,
        editorSettings: getNewCustomUrlDefaults(
          this.props.job,
          dashboards,
          dataViewListItems,
          this.props.isPartialDFAJob
        ),
      };
    });
  };

  setEditCustomUrl = (customUrl: CustomUrlSettings) => {
    this.setState({
      editorSettings: customUrl,
    });
  };

  addNewCustomUrl = () => {
    const { dashboard } = this.context.services;

    buildCustomUrlFromSettings(dashboard, this.state.editorSettings as CustomUrlSettings)
      .then((customUrl) => {
        const customUrls = [...this.state.customUrls, customUrl];
        this.props.setCustomUrls(customUrls);
        this.setState({ editorOpen: false });
      })
      .catch((error) => {
        this.toastNotificationService!.displayErrorToast(
          error,
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.addNewUrlErrorNotificationMessage',
            {
              defaultMessage:
                'An error occurred building the new custom URL from the supplied settings',
            }
          )
        );
      });
  };

  onTestButtonClick = () => {
    const {
      http: { basePath },
      data: { dataViews },
      dashboard,
      mlServices: { mlApi },
    } = this.context.services;
    const dataViewId = this.state?.editorSettings?.kibanaSettings?.discoverIndexPatternId;
    const job = this.props.job;
    dataViews
      .get(dataViewId ?? '')
      .catch((error) => {
        // We still want to try to get the test URL as not all custom urls require a timefield to be passed.
        // eslint-disable-next-line no-console
        console.error('Error obtaining data view:', error);
      })
      .then((dataView) => {
        const timefieldName = dataView?.timeFieldName ?? null;
        buildCustomUrlFromSettings(dashboard, this.state.editorSettings as CustomUrlSettings).then(
          (customUrl) => {
            getTestUrl(
              mlApi,
              job,
              customUrl,
              timefieldName,
              this.props.currentTimeFilter,
              this.props.isPartialDFAJob
            )
              .then((testUrl) => {
                openCustomUrlWindow(testUrl, customUrl, basePath.get());
              })
              .catch((error) => {
                this.toastNotificationService!.displayErrorToast(
                  error,
                  i18n.translate(
                    'xpack.ml.jobsList.editJobFlyout.customUrls.getTestUrlErrorNotificationMessage',
                    {
                      defaultMessage:
                        'An error occurred obtaining the URL to test the configuration',
                    }
                  )
                );
              });
          }
        );
      })
      .catch((error) => {
        this.toastNotificationService!.displayErrorToast(
          error,
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.buildUrlErrorNotificationMessage',
            {
              defaultMessage:
                'An error occurred building the custom URL for testing from the supplied settings',
            }
          )
        );
      });
  };

  closeEditor = () => {
    this.setState({ editorOpen: false });
  };

  renderEditor() {
    const { customUrls, editorOpen, editorSettings, dashboards, dataViewListItems } = this.state;

    const editMode = this.props.editMode ?? 'inline';
    const editor = (
      <CustomUrlEditor
        showCustomTimeRangeSelector={
          isDataFrameAnalyticsConfigs(this.props.job) || this.props.isPartialDFAJob === true
        }
        customUrl={editorSettings}
        setEditCustomUrl={this.setEditCustomUrl}
        savedCustomUrls={customUrls}
        dashboards={dashboards}
        dataViewListItems={dataViewListItems}
        job={this.props.job}
        isPartialDFAJob={this.props.isPartialDFAJob}
      />
    );

    const isValidEditorSettings =
      editorOpen && editorSettings !== undefined
        ? isValidCustomUrlSettings(editorSettings, customUrls)
        : true;

    const addButton = (
      <EuiButton
        onClick={this.addNewCustomUrl}
        isDisabled={!isValidEditorSettings}
        data-test-subj="mlJobAddCustomUrl"
      >
        <FormattedMessage
          id="xpack.ml.jobsList.editJobFlyout.customUrls.addButtonLabel"
          defaultMessage="Add"
        />
      </EuiButton>
    );

    const testButton = (
      <EuiButtonEmpty
        iconType="popout"
        iconSide="right"
        onClick={this.onTestButtonClick}
        isDisabled={!isValidEditorSettings}
      >
        <FormattedMessage
          id="xpack.ml.jobsList.editJobFlyout.customUrls.testButtonLabel"
          defaultMessage="Test"
        />
      </EuiButtonEmpty>
    );

    return editMode === 'inline' ? (
      <EuiPanel className="edit-custom-url-panel">
        <EuiButtonIcon
          color="text"
          onClick={this.closeEditor}
          iconType="cross"
          aria-label={i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.closeEditorAriaLabel',
            {
              defaultMessage: 'Close custom URL editor',
            }
          )}
        />

        {editor}

        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>{addButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>{testButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    ) : (
      <EuiModal
        onClose={this.closeEditor}
        initialFocus="[name=label]"
        style={{ width: 500 }}
        data-test-subj="mlJobNewCustomUrlFormModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.jobsList.editJobFlyout.customUrls.addCustomUrlButtonLabel"
              defaultMessage="Add custom URL"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{editor}</EuiModalBody>

        <EuiModalFooter>
          {testButton}
          {addButton}
        </EuiModalFooter>
      </EuiModal>
    );
  }

  render() {
    const { customUrls, editorOpen } = this.state;
    const { editMode = 'inline' } = this.props;

    return (
      <>
        <EuiSpacer size="m" />
        {(!editorOpen || editMode === 'modal') && (
          <EuiButton
            size="s"
            onClick={this.editNewCustomUrl}
            data-test-subj="mlJobOpenCustomUrlFormButton"
          >
            <FormattedMessage
              id="xpack.ml.jobsList.editJobFlyout.customUrls.addCustomUrlButtonLabel"
              defaultMessage="Add custom URL"
            />
          </EuiButton>
        )}
        {editorOpen && this.renderEditor()}
        <EuiSpacer size="l" />
        <CustomUrlList
          job={this.props.job}
          customUrls={customUrls}
          onChange={this.props.setCustomUrls}
          dataViewListItems={this.state.dataViewListItems}
          isPartialDFAJob={this.props.isPartialDFAJob}
        />
      </>
    );
  }
}
