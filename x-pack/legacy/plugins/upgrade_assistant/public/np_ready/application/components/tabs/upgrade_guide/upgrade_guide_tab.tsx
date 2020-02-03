/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiLoadingContent,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CoreStart } from 'kibana/public';
import {
  UpgradeAssistantRecipeEntry,
  UpgradeAssistantInstruction,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../../../plugins/pulse_poc/server/channels/deployment/check_upgrade_assistant';
import { UpgradeAssistantTabComponent, UpgradeAssistantTabProps } from '../../types';
import { UpgradeGuideListElement } from './upgrade_guide_list_element';

interface UpgradeGuideTabProps extends UpgradeAssistantTabProps {
  http: CoreStart['http'];
}

interface UpgradeGuideTabState {
  isLoading: boolean;
  guides: { [targetVersion: string]: UpgradeAssistantRecipeEntry[] };
}

/**
 * Displays a list of deprecations that filterable and groupable. Can be used for cluster,
 * nodes, or indices checkups.
 */
export class UpgradeGuideTab extends UpgradeAssistantTabComponent<
  UpgradeGuideTabProps,
  UpgradeGuideTabState
> {
  constructor(props: UpgradeGuideTabProps) {
    super(props);

    this.state = {
      isLoading: true,
      guides: {},
    };
  }

  public async componentDidMount() {
    const { upgradeAssistant } = await this.props.http.get<UpgradeAssistantInstruction>(
      '/api/upgrade_assistant/guides'
    );
    this.setState({ isLoading: false, guides: upgradeAssistant });
  }

  public render() {
    if (this.state.isLoading) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiPageContent>
            <EuiPageContentBody>
              <EuiLoadingContent lines={3} />
            </EuiPageContentBody>
          </EuiPageContent>
        </Fragment>
      );
    }

    const [guideEntry] = Object.entries(this.state.guides);

    if (!guideEntry) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiText grow={false}>
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.guidesTab.noUpdates"
                defaultMessage="Either you are in the latest version or we haven't released our guide to upgrade yet."
              />
            </p>
          </EuiText>
        </Fragment>
      );
    }
    const [targetVersion, guide] = guideEntry;

    return (
      <Fragment>
        <EuiSpacer />
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.guidesTab.tabDetail"
                    defaultMessage="Guide to upgrade the stack to {targetVersion}"
                    values={{
                      targetVersion,
                    }}
                  />
                </h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <ol>
              {guide.map(entry => (
                <UpgradeGuideListElement entry={entry} />
              ))}
            </ol>
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }
}
