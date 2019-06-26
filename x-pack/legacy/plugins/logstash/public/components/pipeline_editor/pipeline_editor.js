/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import 'brace/mode/plain_text';
import 'brace/theme/github';

import { isEmpty } from 'lodash';
import { TOOLTIPS } from '../../../common/constants/tooltips';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPageContent,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ConfirmDeletePipelineModal } from './confirm_delete_pipeline_modal';
import { FlexItemSetting } from './flex_item_setting';
import { FormLabelWithIconTip } from './form_label_with_icon_tip';
import { PIPELINE_EDITOR } from './constants';

class PipelineEditorUi extends React.Component {
  constructor(props) {
    super(props);

    const {
      pipeline: { id, description, pipeline, settings },
      username,
    } = this.props;

    const pipelineWorkersSet = typeof settings['pipeline.workers'] === 'number';
    const pipelineWorkers = pipelineWorkersSet ? settings['pipeline.workers'] : 1;
    this.state = {
      maxBytesNumber: settings['queue.max_bytes.number'],
      maxBytesUnit: settings['queue.max_bytes.units'],
      pipeline: {
        id,
        description,
        pipeline,
        settings: {
          'pipeline.batch.delay': settings['pipeline.batch.delay'],
          'pipeline.batch.size': settings['pipeline.batch.size'],
          'pipeline.workers': pipelineWorkers,
          'queue.checkpoint.writes': settings['queue.checkpoint.writes'],
          'queue.max_bytes': settings['queue.max_bytes.number'] + settings['queue.max_bytes.units'],
          'queue.type': settings['queue.type'],
        },
        username,
      },
      pipelineIdErrors: [],
      pipelineIdPattern: /^[A-Za-z\_][A-Za-z0-9\-\_]*$/,
      showConfirmDeleteModal: false,
      showPipelineIdError: false,
    };
  }

  componentDidMount = () => {
    const {
      licenseService: { isReadOnly, message },
      toastNotifications,
    } = this.props;
    if (isReadOnly) {
      toastNotifications.addWarning(message);
    }
  };

  hideConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
    });
  };

  showConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  };

  onPipelineIdChange = ({ target: { value } }) => {
    const pipelineIdErrors = [];
    if (!value) {
      pipelineIdErrors.push(PIPELINE_EDITOR.ID_REQUIRED_ERR_MSG);
    }
    if (!this.state.pipelineIdPattern.test(value)) {
      pipelineIdErrors.push(PIPELINE_EDITOR.ID_FORMAT_ERR_MSG);
    }

    this.setState({
      pipelineIdErrors,
      showPipelineIdError: !!pipelineIdErrors.length,
      pipeline: {
        ...this.state.pipeline,
        id: value,
      },
    });
  };

  isSaveDisabled = () => {
    return this.state.showPipelineIdError || isEmpty(this.state.pipeline.id);
  };

  onClose = async () => {
    await this.props.close();
  };

  open = async () => {
    const { id } = this.state.pipeline;
    if (id) {
      await this.props.open(id);
    }
  };

  onPipelineSave = () => {
    const { pipelineService, toastNotifications, intl } = this.props;
    const { id } = this.state.pipeline;
    return pipelineService
      .savePipeline({
        id,
        upstreamJSON: this.state.pipeline,
      })
      .then(() => {
        toastNotifications.addSuccess(intl.formatMessage({
          id: 'xpack.logstash.pipelineEditor.pipelineSuccessfullySavedMessage',
          defaultMessage: 'Saved "{id}"'
        }, {
          id,
        }));
        this.onClose();
      })
      .catch(this.notifyOnError);
  };

  onPipelineDescriptionChange = ({ target: { value } }) => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        description: value,
      },
    });
  };

  onPipelineChange = e => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        pipeline: e,
      },
    });
  };

  handleNumberChange = (settingName, value) => {
    const numberValue = parseInt(value, 10);
    this.handleSettingChange(settingName, isNaN(numberValue) ? value : numberValue);
  };

  handleMaxByteNumberChange = value => {
    this.setState({ maxBytesNumber: parseInt(value, 10) });
    this.handleSettingChange('queue.max_bytes', value + this.state.maxBytesUnit);
  };

  handleMaxByteUnitChange = value => {
    this.setState({ maxBytesUnit: value });
    this.handleSettingChange('queue.max_bytes', this.state.maxBytesNumber + value);
  };

  handleSettingChange = (settingName, value) => {
    const settings = { ...this.state.pipeline.settings };
    settings[settingName] = value;
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        settings,
      },
    });
  };

  notifyOnError = err => {
    const { licenseService, toastNotifications } = this.props;

    return licenseService.checkValidity().then(() => {
      toastNotifications.addError(err, {
        title: i18n.translate('xpack.logstash.pipelineEditor.errorHandlerToastTitle', {
          defaultMessage: 'Pipeline error'
        }),
      });
    });
  };

  deletePipeline = () => {
    const {
      pipeline: { id },
      pipelineService,
      toastNotifications,
      intl,
    } = this.props;

    this.hideConfirmDeleteModal();

    return pipelineService
      .deletePipeline(id)
      .then(() => {
        toastNotifications.addSuccess(intl.formatMessage({
          id: 'xpack.logstash.pipelineEditor.pipelineSuccessfullyDeletedMessage',
          defaultMessage: 'Deleted "{id}"'
        }, {
          id,
        }));
        this.onClose();
      })
      .catch(this.notifyOnError);
  };

  getPipelineHeadingText = () => {
    const {
      routeService: {
        current: {
          params: { clone, id },
        },
      },
      isNewPipeline,
      intl,
    } = this.props;

    if (!!clone && id) {
      return intl.formatMessage({
        id: 'xpack.logstash.pipelineEditor.clonePipelineTitle',
        defaultMessage: 'Clone Pipeline "{id}"'
      }, {
        id,
      });
    }
    if (!isNewPipeline) {
      return intl.formatMessage({
        id: 'xpack.logstash.pipelineEditor.editPipelineTitle',
        defaultMessage: 'Edit Pipeline "{id}"'
      }, {
        id: this.state.pipeline.id,
      });
    }
    return intl.formatMessage({
      id: 'xpack.logstash.pipelineEditor.createPipelineTitle',
      defaultMessage: 'Create Pipeline'
    });
  };

  render() {
    const { intl } = this.props;

    return (
      <div data-test-subj={`pipelineEdit pipelineEdit-${this.state.pipeline.id}`}>
        <EuiPageContent
          style={{
            width: 1100,
          }}
          verticalPosition="center"
          horizontalPosition="center"
        >
          <EuiTitle size="m">
            <h2>{this.getPipelineHeadingText()}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiForm isInvalid={this.state.showPipelineIdError} error={this.state.pipelineIdErrors}>
            {this.props.isNewPipeline && (
              <EuiFormRow
                fullWidth
                label={(<FormattedMessage
                  id="xpack.logstash.pipelineEditor.pipelineIdFormRowLabel"
                  defaultMessage="Pipeline ID"
                />)}
              >
                <EuiFieldText
                  fullWidth
                  data-test-subj="inputId"
                  isInvalid={this.state.showPipelineIdError}
                  name="pipelineId"
                  onBlur={this.onPipelineIdChange}
                  onChange={this.onPipelineIdChange}
                  value={this.state.pipeline.id || ''}
                />
              </EuiFormRow>
            )}
            <EuiFormRow
              fullWidth
              label={(<FormattedMessage
                id="xpack.logstash.pipelineEditor.descriptionFormRowLabel"
                defaultMessage="Description"
              />)}
            >
              <EuiFieldText
                data-test-subj="inputDescription"
                fullWidth
                name="pipelineDescription"
                onChange={this.onPipelineDescriptionChange}
                value={this.state.pipeline.description || ''}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={(<FormattedMessage
                id="xpack.logstash.pipelineEditor.pipelineFormRowLabel"
                defaultMessage="Pipeline"
              />)}
            >
              <div data-test-subj="acePipeline">
                <EuiCodeEditor
                  mode="plain_text"
                  onChange={this.onPipelineChange}
                  setOptions={{
                    minLines: 25,
                    maxLines: Infinity,
                    readOnly: this.props.licenseService.isReadOnly,
                  }}
                  theme="github"
                  value={this.state.pipeline.pipeline}
                  width={'1017'}
                />
              </div>
            </EuiFormRow>
            <EuiFormRow
              label={
                <FormLabelWithIconTip
                  formRowLabelText={intl.formatMessage({
                    id: 'xpack.logstash.pipelineEditor.pipelineWorkersFormRowLabel',
                    defaultMessage: 'Pipeline workers'
                  })}
                  formRowTooltipText={TOOLTIPS.settings['pipeline.workers']}
                />
              }
            >
              <EuiFieldNumber
                data-test-subj="inputWorkers"
                onChange={e => this.handleNumberChange('pipeline.workers', e.target.value)}
                value={this.state.pipeline.settings['pipeline.workers']}
              />
            </EuiFormRow>
            <EuiFlexGroup>
              <FlexItemSetting
                formRowLabelText={intl.formatMessage({
                  id: 'xpack.logstash.pipelineEditor.pipelineBatchSizeFormRowLabel',
                  defaultMessage: 'Pipeline batch size'
                })}
                formRowTooltipText={TOOLTIPS.settings['pipeline.batch.size']}
              >
                <EuiFieldNumber
                  data-test-subj="inputBatchSize"
                  onChange={e => this.handleNumberChange('pipeline.batch.size', e.target.value)}
                  value={this.state.pipeline.settings['pipeline.batch.size']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText={intl.formatMessage({
                  id: 'xpack.logstash.pipelineEditor.pipelineBatchDelayFormRowLabel',
                  defaultMessage: 'Pipeline batch delay'
                })}
                formRowTooltipText={TOOLTIPS.settings['pipeline.batch.delay']}
              >
                <EuiFieldNumber
                  data-test-subj="inputBatchDelay"
                  onChange={e => this.handleNumberChange('pipeline.batch.delay', e.target.value)}
                  value={this.state.pipeline.settings['pipeline.batch.delay']}
                />
              </FlexItemSetting>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <FlexItemSetting
                formRowLabelText={intl.formatMessage({
                  id: 'xpack.logstash.pipelineEditor.queueTypeFormRowLabel',
                  defaultMessage: 'Queue type'
                })}
                formRowTooltipText={TOOLTIPS.settings['queue.type']}
              >
                <EuiSelect
                  data-test-subj="selectQueueType"
                  onChange={e => this.handleSettingChange('queue.type', e.target.value)}
                  options={PIPELINE_EDITOR.QUEUE_TYPES}
                  value={this.state.pipeline.settings['queue.type']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText={intl.formatMessage({
                  id: 'xpack.logstash.pipelineEditor.queueMaxBytesFormRowLabel',
                  defaultMessage: 'Queue max bytes'
                })}
                formRowTooltipText={TOOLTIPS.settings['queue.max_bytes']}
              >
                <EuiFieldNumber
                  data-test-subj="inputQueueMaxBytesNumber"
                  onChange={e => this.handleMaxByteNumberChange(e.target.value)}
                  value={this.state.maxBytesNumber}
                />
              </FlexItemSetting>
              <FlexItemSetting>
                <EuiSelect
                  data-test-subj="selectQueueMaxBytesUnits"
                  onChange={e => this.handleMaxByteUnitChange(e.target.value)}
                  options={PIPELINE_EDITOR.UNITS}
                  value={this.state.maxBytesUnit}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText={intl.formatMessage({
                  id: 'xpack.logstash.pipelineEditor.queueCheckpointWritesFormRowLabel',
                  defaultMessage: 'Queue checkpoint writes'
                })}
                formRowTooltipText={TOOLTIPS.settings['queue.checkpoint.writes']}
              >
                <EuiFieldNumber
                  data-test-subj="inputQueueCheckpointWrites"
                  onChange={e => this.handleNumberChange('queue.checkpoint.writes', e.target.value)}
                  value={this.state.pipeline.settings['queue.checkpoint.writes']}
                />
              </FlexItemSetting>
            </EuiFlexGroup>
          </EuiForm>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="btnSavePipeline"
                fill
                isDisabled={this.isSaveDisabled()}
                onClick={this.onPipelineSave}
              >
                <FormattedMessage
                  id="xpack.logstash.pipelineEditor.createAndDeployButtonLabel"
                  defaultMessage="Create and deploy"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="btnCancel" onClick={this.onClose}>
                <FormattedMessage
                  id="xpack.logstash.pipelineEditor.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButton>
            </EuiFlexItem>
            {!this.props.isNewPipeline && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  data-test-subj="btnDeletePipeline"
                  onClick={this.showConfirmDeleteModal}
                >
                  <FormattedMessage
                    id="xpack.logstash.pipelineEditor.deletePipelineButtonLabel"
                    defaultMessage="Delete pipeline"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageContent>
        {this.state.showConfirmDeleteModal && (
          <ConfirmDeletePipelineModal
            id={this.props.pipeline.id}
            cancelDeleteModal={this.hideConfirmDeleteModal}
            confirmDeletePipeline={this.deletePipeline}
          />
        )}
      </div>
    );
  }
}

PipelineEditorUi.propTypes = {
  close: PropTypes.func.isRequired,
  isNewPipeline: PropTypes.bool.isRequired,
  licenseService: PropTypes.shape({
    checkValidity: PropTypes.func.isRequired,
    isReadOnly: PropTypes.bool.isRequired,
    message: PropTypes.string,
  }).isRequired,
  open: PropTypes.func.isRequired,
  pipeline: PropTypes.shape({
    id: PropTypes.string,
    description: PropTypes.string,
    pipeline: PropTypes.any,
    settings: PropTypes.shape({
      'pipeline.batch.delay': PropTypes.number.isRequired,
      'pipeline.batch.size': PropTypes.number.isRequired,
      'pipeline.workers': PropTypes.number,
      'queue.checkpoint.writes': PropTypes.number.isRequired,
      'queue.max_bytes': PropTypes.number,
      'queue.type': PropTypes.string.isRequired,
    }),
  }).isRequired,
  pipelineService: PropTypes.shape({
    deletePipeline: PropTypes.func.isRequired,
    savePipeline: PropTypes.func.isRequired,
  }).isRequired,
  routeService: PropTypes.shape({
    current: PropTypes.shape({
      params: PropTypes.shape({
        clone: PropTypes.oneOf([true, undefined]),
        id: PropTypes.string,
      }),
    }),
  }).isRequired,
  toastNotifications: PropTypes.shape({
    addWarning: PropTypes.func.isRequired,
    addSuccess: PropTypes.func.isRequired,
    addError: PropTypes.func.isRequired,
  }).isRequired,
  username: PropTypes.string,
};

export const PipelineEditor = injectI18n(PipelineEditorUi);
