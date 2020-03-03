/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { i18n } from '@kbn/i18n';
import { CustomUrlEditor, CustomUrlList } from '../../../../components/custom_url_editor';
import {
  getNewCustomUrlDefaults,
  getQueryEntityFieldNames,
  isValidCustomUrlSettings,
  buildCustomUrlFromSettings,
  getTestUrl,
  CustomUrlSettings,
} from '../../../../components/custom_url_editor/utils';
import { withKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { loadSavedDashboards, loadIndexPatterns } from '../edit_utils';
import { openCustomUrlWindow } from '../../../../../util/custom_url_utils';
import { Job } from '../../../../new_job/common/job_creator/configs';
import { UrlConfig } from '../../../../../../../common/types/custom_urls';
import { IIndexPattern } from '../../../../../../../../../../../src/plugins/data/common/index_patterns';
import { MlKibanaReactContextValue } from '../../../../../contexts/kibana';

const MAX_NUMBER_DASHBOARDS = 1000;
const MAX_NUMBER_INDEX_PATTERNS = 1000;

interface CustomUrlsProps {
  job: Job;
  jobCustomUrls: UrlConfig[];
  setCustomUrls: (customUrls: UrlConfig[]) => void;
  editMode: 'inline' | 'modal';
  kibana: MlKibanaReactContextValue;
}

interface CustomUrlsState {
  customUrls: UrlConfig[];
  dashboards: any[];
  indexPatterns: IIndexPattern[];
  queryEntityFieldNames: string[];
  editorOpen: boolean;
  editorSettings?: CustomUrlSettings;
}

class CustomUrlsUI extends Component<CustomUrlsProps, CustomUrlsState> {
  constructor(props: CustomUrlsProps) {
    super(props);

    this.state = {
      customUrls: [],
      dashboards: [],
      indexPatterns: [],
      queryEntityFieldNames: [],
      editorOpen: false,
    };
  }

  static getDerivedStateFromProps(props: CustomUrlsProps) {
    return {
      job: props.job,
      customUrls: props.jobCustomUrls,
      queryEntityFieldNames: getQueryEntityFieldNames(props.job),
    };
  }

  componentDidMount() {
    const { toasts } = this.props.kibana.services.notifications;
    loadSavedDashboards(MAX_NUMBER_DASHBOARDS)
      .then(dashboards => {
        this.setState({ dashboards });
      })
      .catch(resp => {
        // eslint-disable-next-line no-console
        console.error('Error loading list of dashboards:', resp);
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadSavedDashboardsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved Kibana dashboards',
            }
          )
        );
      });

    loadIndexPatterns(MAX_NUMBER_INDEX_PATTERNS)
      .then(indexPatterns => {
        this.setState({ indexPatterns });
      })
      .catch(resp => {
        // eslint-disable-next-line no-console
        console.error('Error loading list of dashboards:', resp);
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadIndexPatternsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved index patterns',
            }
          )
        );
      });
  }

  editNewCustomUrl = () => {
    // Opens the editor for configuring a new custom URL.
    this.setState(prevState => {
      const { dashboards, indexPatterns } = prevState;

      return {
        editorOpen: true,
        editorSettings: getNewCustomUrlDefaults(this.props.job, dashboards, indexPatterns),
      };
    });
  };

  setEditCustomUrl = (customUrl: CustomUrlSettings) => {
    this.setState({
      editorSettings: customUrl,
    });
  };

  addNewCustomUrl = () => {
    buildCustomUrlFromSettings(this.state.editorSettings as CustomUrlSettings)
      .then(customUrl => {
        const customUrls = [...this.state.customUrls, customUrl];
        this.props.setCustomUrls(customUrls);
        this.setState({ editorOpen: false });
      })
      .catch((error: any) => {
        // eslint-disable-next-line no-console
        console.error('Error building custom URL from settings:', error);
        const { toasts } = this.props.kibana.services.notifications;
        toasts.addDanger(
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
    const { toasts } = this.props.kibana.services.notifications;
    const job = this.props.job;
    buildCustomUrlFromSettings(this.state.editorSettings as CustomUrlSettings)
      .then(customUrl => {
        getTestUrl(job, customUrl)
          .then(testUrl => {
            openCustomUrlWindow(testUrl, customUrl);
          })
          .catch(resp => {
            // eslint-disable-next-line no-console
            console.error('Error obtaining URL for test:', resp);
            toasts.addWarning(
              i18n.translate(
                'xpack.ml.jobsList.editJobFlyout.customUrls.getTestUrlErrorNotificationMessage',
                {
                  defaultMessage: 'An error occurred obtaining the URL to test the configuration',
                }
              )
            );
          });
      })
      .catch(resp => {
        // eslint-disable-next-line no-console
        console.error('Error building custom URL from settings:', resp);
        toasts.addWarning(
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
    const {
      customUrls,
      editorOpen,
      editorSettings,
      dashboards,
      indexPatterns,
      queryEntityFieldNames,
    } = this.state;

    const editMode = this.props.editMode ?? 'inline';
    const editor = (
      <CustomUrlEditor
        customUrl={editorSettings}
        setEditCustomUrl={this.setEditCustomUrl}
        savedCustomUrls={customUrls}
        dashboards={dashboards}
        indexPatterns={indexPatterns}
        queryEntityFieldNames={queryEntityFieldNames}
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
          className="close-editor-button"
        />

        {editor}

        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>{addButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>{testButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    ) : (
      <EuiOverlayMask>
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
      </EuiOverlayMask>
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
          setCustomUrls={this.props.setCustomUrls}
        />
      </>
    );
  }
}

export const CustomUrls = withKibana(CustomUrlsUI);
