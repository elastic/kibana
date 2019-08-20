/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, Component } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSteps,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLink,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiCheckbox,
} from '@elastic/eui';
import { getInstructionSteps } from '../instruction_steps';
import { Storage } from 'ui/storage';
import { STORAGE_KEY, ELASTICSEARCH_CUSTOM_ID } from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  INSTRUCTION_STEP_SET_MONITORING_URL,
  INSTRUCTION_STEP_ENABLE_METRICBEAT,
  INSTRUCTION_STEP_DISABLE_INTERNAL
} from '../constants';
import { KIBANA_SYSTEM_ID, BEATS_SYSTEM_ID } from '../../../../../telemetry/common/constants';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const storage = new Storage(window.localStorage);
const ES_MONITORING_URL_KEY = `${STORAGE_KEY}.mb_migration.esMonitoringUrl`;
const DEFAULT_ES_MONITORING_URL = 'http://localhost:9200';

export class Flyout extends Component {
  constructor(props) {
    super(props);

    let esMonitoringUrl = storage.get(ES_MONITORING_URL_KEY);
    if (!esMonitoringUrl) {
      esMonitoringUrl = props.monitoringHosts ? props.monitoringHosts[0] : DEFAULT_ES_MONITORING_URL;
    }

    this.checkInterval = null;

    let activeStep = INSTRUCTION_STEP_SET_MONITORING_URL;
    if (props.product && props.product.isPartiallyMigrated) {
      activeStep = INSTRUCTION_STEP_DISABLE_INTERNAL;
    }

    this.state = {
      activeStep,
      esMonitoringUrl,
      checkedStatusByStep: {
        [INSTRUCTION_STEP_ENABLE_METRICBEAT]: false,
        [INSTRUCTION_STEP_DISABLE_INTERNAL]: false,
        userAcknowledgedNoClusterUuidPrompt: false
      },
    };
  }

  setEsMonitoringUrl = esMonitoringUrl => {
    storage.set(ES_MONITORING_URL_KEY, esMonitoringUrl);
    this.setState({ esMonitoringUrl });
  }

  finishedFlyout() {
    const { onClose } = this.props;
    onClose();
  }

  renderActiveStep() {
    const { product, productName, onClose, meta } = this.props;
    const {
      activeStep,
      esMonitoringUrl,
      checkedStatusByStep,
    } = this.state;

    switch (activeStep) {
      case INSTRUCTION_STEP_SET_MONITORING_URL:
        return (
          <EuiForm>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.monitoring.metricbeatMigration.flyout.step1.monitoringUrlLabel', {
                defaultMessage: 'Monitoring cluster URL'
              })}
              helpText={i18n.translate('xpack.monitoring.metricbeatMigration.flyout.step1.monitoringUrlHelpText', {
                defaultMessage: `This is typically a single instance, but if you have multiple, enter all of instance urls comma-separated.
                Keep in mind that the running metricbeat instance will need to be able to communicate with these Elasticsearch servers.`
              })}
            >
              <EuiFieldText
                fullWidth
                value={esMonitoringUrl}
                onChange={e => this.setEsMonitoringUrl(e.target.value)}
              />
            </EuiFormRow>
          </EuiForm>
        );
      case INSTRUCTION_STEP_ENABLE_METRICBEAT:
      case INSTRUCTION_STEP_DISABLE_INTERNAL:
        const instructionSteps = getInstructionSteps(productName, product, activeStep, meta, {
          doneWithMigration: onClose,
          esMonitoringUrl,
          hasCheckedStatus: checkedStatusByStep[activeStep],
        });

        return (
          <Fragment>
            <EuiSteps steps={instructionSteps}/>
          </Fragment>
        );
    }

    return null;
  }

  renderActiveStepNextButton() {
    const { product, productName } = this.props;
    const { activeStep, esMonitoringUrl, userAcknowledgedNoClusterUuidPrompt } = this.state;

    // It is possible that, during the migration steps, products are not reporting
    // monitoring data for a period of time outside the window of our server-side check
    // and this is most likely temporary so we want to be defensive and not error out
    // and hopefully wait for the next check and this state will be self-corrected.
    if (!product) {
      return null;
    }

    let willDisableDoneButton = !product.isFullyMigrated;
    let willShowNextButton = activeStep !== INSTRUCTION_STEP_DISABLE_INTERNAL;

    if (activeStep === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
      if (productName === ELASTICSEARCH_CUSTOM_ID) {
        willShowNextButton = false;
        // ES can be fully migrated for net new users
        willDisableDoneButton = !product.isPartiallyMigrated && !product.isFullyMigrated;
      }
      else {
        // Do not bother taking them to the disable internal step for non ES use cases
        // since disabling is an individual action per node, versus ES where it is
        // a cluster setting
        willShowNextButton = !product.isFullyMigrated;
        willDisableDoneButton = !product.isFullyMigrated;
      }
    }

    // This is a possible scenario that come up during testing where logstash/beats
    // is not outputing to ES, but has monitorining enabled. In these scenarios,
    // the monitoring documents will not have a `cluster_uuid` so once migrated,
    // the instance/node will actually live in the standalone cluster listing
    // instead of the one it currently lives in. We need the user to understand
    // this so we're going to force them to acknowledge a prompt saying this
    if (product.isFullyMigrated && product.clusterUuid === null) {
      // Did they acknowledge the prompt?
      if (!userAcknowledgedNoClusterUuidPrompt) {
        willDisableDoneButton = true;
      }
    }

    if (willShowNextButton) {
      let isDisabled = false;
      let nextStep = null;
      if (activeStep === INSTRUCTION_STEP_SET_MONITORING_URL) {
        isDisabled = !esMonitoringUrl || esMonitoringUrl.length === 0;
        if (product.isPartiallyMigrated || product.isFullyMigrated) {
          nextStep = INSTRUCTION_STEP_DISABLE_INTERNAL;
        }
        else {
          nextStep = INSTRUCTION_STEP_ENABLE_METRICBEAT;
        }
      }
      else if (activeStep === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        isDisabled = !product.isPartiallyMigrated && !product.isFullyMigrated;
        nextStep = INSTRUCTION_STEP_DISABLE_INTERNAL;
      }

      return (
        <EuiButton
          type="submit"
          fill
          iconType="sortRight"
          iconSide="right"
          isDisabled={isDisabled}
          onClick={() => this.setState({ activeStep: nextStep })}
        >
          {i18n.translate('xpack.monitoring.metricbeatMigration.flyout.nextButtonLabel', {
            defaultMessage: 'Next'
          })}
        </EuiButton>
      );
    }
    return (
      <EuiButton
        type="submit"
        fill
        isDisabled={willDisableDoneButton}
        onClick={() => this.finishedFlyout()}
      >
        {i18n.translate('xpack.monitoring.metricbeatMigration.flyout.doneButtonLabel', {
          defaultMessage: 'Done'
        })}
      </EuiButton>
    );
  }

  getDocumentationTitle() {
    const { productName } = this.props;

    let documentationUrl = null;
    if (productName === KIBANA_SYSTEM_ID) {
      documentationUrl = `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/monitoring-metricbeat.html`;
    }
    else if (productName === ELASTICSEARCH_CUSTOM_ID) {
      documentationUrl = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/configuring-metricbeat.html`;
    }

    if (!documentationUrl) {
      return null;
    }

    return (
      <EuiText size="s">
        <EuiLink href={documentationUrl} target="_blank">
          Read more about this migration.
        </EuiLink>
      </EuiText>
    );
  }

  render() {
    const { onClose, instance, productName, product } = this.props;

    let instanceType = null;
    let instanceName = instance ? instance.name : null;

    if (productName === KIBANA_SYSTEM_ID) {
      instanceType = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.kibanaInstance', {
        defaultMessage: 'instance',
      });
    }
    else if (productName === ELASTICSEARCH_CUSTOM_ID) {
      if (instance) {
        instanceType = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.elasticsearchNode', {
          defaultMessage: 'node',
        });
      }
      else {
        instanceName = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.elasticsearchNodesTitle', {
          defaultMessage: 'Elasticsearch nodes',
        });
      }
    }

    let title = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.flyoutTitle', {
      defaultMessage: 'Migrate {instanceName} {instanceType} to Metricbeat',
      values: {
        instanceName,
        instanceType
      }
    });

    if (product.isNetNewUser) {
      title = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.flyoutTitleNewUser', {
        defaultMessage: 'Monitor {instanceName} {instanceType} with Metricbeat',
        values: {
          instanceName,
          instanceType
        }
      });
    }

    let noClusterUuidPrompt = null;
    if (product.isFullyMigrated && product.clusterUuid === null) {
      const nodeText = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.node', {
        defaultMessage: 'node'
      });
      const instanceText = i18n.translate('xpack.monitoring.metricbeatMigration.flyout.instance', {
        defaultMessage: 'instance'
      });

      let typeText = nodeText;
      if (productName === BEATS_SYSTEM_ID) {
        typeText = instanceText;
      }

      noClusterUuidPrompt = (
        <Fragment>
          <EuiCallOut
            color="warning"
            iconType="help"
            title={i18n.translate(
              'xpack.monitoring.metricbeatMigration.flyout.noClusterUuidTitle',
              {
                defaultMessage: 'No cluster detected'
              }
            )}
          >
            <p>
              <FormattedMessage
                id="xpack.monitoring.metricbeatMigration.flyout.noClusterUuidDescription"
                defaultMessage="This {productName} {typeText} is not connected to an Elasticsearch cluster so once fully migrated,
                this {productName} {typeText} will appear in the Standalone cluster instead of this one. {link}"
                values={{
                  productName,
                  typeText,
                  link: (
                    <EuiLink href={`#/overview?_g=(cluster_uuid:__standalone_cluster__)`} target="_blank">
                      Click here to view the Standalone cluster.
                    </EuiLink>
                  )
                }}
              />
            </p>
            <EuiSpacer size="s"/>
            <EuiCheckbox
              id="monitoringFlyoutNoClusterUuidCheckbox"
              label={i18n.translate(
                'xpack.monitoring.metricbeatMigration.flyout.noClusterUuidCheckboxLabel',
                {
                  defaultMessage: `Yes, I understand that I will need to look in the Standalone cluster for
                  this {productName} {typeText}.`,
                  values: {
                    productName,
                    typeText
                  }
                }
              )}
              checked={this.state.userAcknowledgedNoClusterUuidPrompt}
              onChange={e => this.setState({ userAcknowledgedNoClusterUuidPrompt: e.target.checked })}
            />
          </EuiCallOut>
          <EuiSpacer size="s"/>
        </Fragment>
      );
    }

    return (
      <EuiFlyout
        onClose={onClose}
        aria-labelledby="flyoutTitle"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              {title}
            </h2>
          </EuiTitle>
          {this.getDocumentationTitle()}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {this.renderActiveStep()}
          {noClusterUuidPrompt}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={onClose}
                flush="left"
              >
                {i18n.translate('xpack.monitoring.metricbeatMigration.flyout.closeButtonLabel', {
                  defaultMessage: 'Close'
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {this.renderActiveStepNextButton()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
