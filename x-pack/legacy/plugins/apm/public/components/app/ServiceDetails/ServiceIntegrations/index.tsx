/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiPopover
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import React, { Fragment } from 'react';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { LicenseContext } from '../../../../context/LicenseContext';
import { MachineLearningFlyout } from './MachineLearningFlyout';
import { WatcherFlyout } from './WatcherFlyout';
import { ApmPluginContext } from '../../../../context/ApmPluginContext';

interface Props {
  urlParams: IUrlParams;
}
interface State {
  isPopoverOpen: boolean;
  activeFlyout: FlyoutName;
}
type FlyoutName = null | 'ML' | 'Watcher';

export class ServiceIntegrations extends React.Component<Props, State> {
  static contextType = ApmPluginContext;
  context!: React.ContextType<typeof ApmPluginContext>;

  public state: State = { isPopoverOpen: false, activeFlyout: null };

  public getPanelItems = memoize((mlAvailable: boolean | undefined) => {
    let panelItems: EuiContextMenuPanelItemDescriptor[] = [];
    if (mlAvailable) {
      panelItems = panelItems.concat(this.getMLPanelItems());
    }
    return panelItems.concat(this.getWatcherPanelItems());
  });

  public getMLPanelItems = () => {
    return [
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableMLAnomalyDetectionButtonLabel',
          {
            defaultMessage: 'Enable ML anomaly detection'
          }
        ),
        icon: 'machineLearningApp',
        toolTipContent: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableMLAnomalyDetectionButtonTooltip',
          {
            defaultMessage: 'Set up a machine learning job for this service'
          }
        ),
        onClick: () => {
          this.closePopover();
          this.openFlyout('ML');
        }
      }
    ];
  };

  public getWatcherPanelItems = () => {
    const { core } = this.context;

    return [
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableWatcherErrorReportsButtonLabel',
          {
            defaultMessage: 'Enable watcher error reports'
          }
        ),
        icon: 'watchesApp',
        onClick: () => {
          this.closePopover();
          this.openFlyout('Watcher');
        }
      },
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.viewWatchesButtonLabel',
          {
            defaultMessage: 'View existing watches'
          }
        ),
        icon: 'watchesApp',
        href: core.http.basePath.prepend(
          '/app/kibana#/management/elasticsearch/watcher'
        ),
        target: '_blank',
        onClick: () => this.closePopover()
      }
    ];
  };

  public openPopover = () =>
    this.setState({
      isPopoverOpen: true
    });

  public closePopover = () =>
    this.setState({
      isPopoverOpen: false
    });

  public openFlyout = (name: FlyoutName) =>
    this.setState({ activeFlyout: name });

  public closeFlyouts = () => this.setState({ activeFlyout: null });

  public render() {
    const button = (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPopover}
      >
        {i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.integrationsButtonLabel',
          {
            defaultMessage: 'Integrations'
          }
        )}
      </EuiButtonEmpty>
    );

    return (
      <LicenseContext.Consumer>
        {license => (
          <Fragment>
            <EuiPopover
              id="integrations-menu"
              button={button}
              isOpen={this.state.isPopoverOpen}
              closePopover={this.closePopover}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenu
                initialPanelId={0}
                panels={[
                  {
                    id: 0,
                    items: this.getPanelItems(license.features.ml?.is_available)
                  }
                ]}
              />
            </EuiPopover>
            <MachineLearningFlyout
              isOpen={this.state.activeFlyout === 'ML'}
              onClose={this.closeFlyouts}
              urlParams={this.props.urlParams}
            />
            <WatcherFlyout
              isOpen={this.state.activeFlyout === 'Watcher'}
              onClose={this.closeFlyouts}
              urlParams={this.props.urlParams}
            />
          </Fragment>
        )}
      </LicenseContext.Consumer>
    );
  }
}
