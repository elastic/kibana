/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiGlobalToastList,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { documentationLinks } from '../../lib/documentation_links';
import { RootState } from '../../reducers';

const steps = [
  {
    title: i18n.translate('xpack.code.adminPage.setupGuide.checkMultiInstanceTitle', {
      defaultMessage: 'Check if multiple Kibana instances are used as a clusterURL',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.checkMultiInstanceDescription1"
            defaultMessage="If you are using single Kibana instance, you can skip this step."
          />
        </p>

        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.checkMultiInstanceDescription2"
            defaultMessage="If you are using multiple Kibana instances, you need to assign one Kibana instance as `Code node`.
                  To do this, add the following line of code into your kibana.yml file of every
                  Kibana instance and restart the instances:"
          />
        </p>
        <pre>
          <code>xpack.code.codeNodeUrl: 'http://$YourCodeNodeAddress'</code>
        </pre>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.checkMultiInstanceDescription3"
            defaultMessage="Where `$YourCodeNoteAddress` is the URL of your assigned Code node accessible by other Kibana instances."
          />
        </p>
      </EuiText>
    ),
  },
  {
    title: i18n.translate('xpack.code.adminPage.setupGuide.installExtraLangSupportTitle', {
      defaultMessage: 'Install extra language support optionally',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.installExtraLangSupportDescription1"
            defaultMessage="Look {link} to learn more about supported languages and language server installation."
            values={{
              link: (
                <EuiLink href={documentationLinks.codeInstallLangServer} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.installExtraLangSupportHereLinkText"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.installExtraLangSupportDescription2"
            defaultMessage="If you need Java language support, you can manage language server installation {link}."
            values={{
              link: (
                <Link to="/admin?tab=LanguageServers">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.installExtraLangSupportHereLinkText"
                    defaultMessage="here"
                  />
                </Link>
              ),
            }}
          />
        </p>
      </EuiText>
    ),
  },
  {
    title: i18n.translate('xpack.code.adminPage.setupGuide.addRepositoryTitle', {
      defaultMessage: 'Add a repository to Code',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.addRepositoryDescription"
            defaultMessage="Import {sampleRepoLink} or {ownRepoLink}. It is as easy as copy and paste git clone URLs to Code."
            values={{
              sampleRepoLink: (
                <EuiLink href={documentationLinks.codeGettingStarted} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.addRepositorySampleRepoLinkText"
                    defaultMessage="a sample repo"
                  />
                </EuiLink>
              ),
              ownRepoLink: (
                <EuiLink href={documentationLinks.codeRepoManagement} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.addRepositoryOwnRepoLinkText"
                    defaultMessage="your own repo"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    ),
  },
  {
    title: i18n.translate('xpack.code.adminPage.setupGuide.verifyImportTitle', {
      defaultMessage: 'Verify the repo is successfully imported',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.code.adminPage.setupGuide.verifyImportDescription"
            defaultMessage="You can verify your repo is successfully imported by {searchingLink} and {navigatingLink} the repo. If language support is available to the repo, make sure {semanticNavigationLink} is available as well."
            values={{
              searchingLink: (
                <EuiLink href={documentationLinks.codeSearch} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.verifyImportSearchingLinkText"
                    defaultMessage="searching"
                  />
                </EuiLink>
              ),
              navigatingLink: (
                <EuiLink href={documentationLinks.codeOtherFeatures} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.verifyImportNavigatingLinkText"
                    defaultMessage="navigating"
                  />
                </EuiLink>
              ),
              semanticNavigationLink: (
                <EuiLink href={documentationLinks.semanticNavigation} target="_blank">
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.verifyImportSemanticNavigatingLinkText"
                    defaultMessage="semantic navigation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    ),
  },
];

const toastMessage = (
  <div>
    <p>
      <FormattedMessage
        id="xpack.code.adminPage.setupGuide.permissionChangesDescription"
        defaultMessage="We’ve made some changes to roles and permissions in Kibana. Read more about how these changes affect your Code implementation below."
      />
    </p>
    <EuiButton size="s" href={documentationLinks.kibanaRoleManagement}>
      <FormattedMessage
        id="xpack.code.adminPage.setupGuide.learnMoreButtonLabel"
        defaultMessage="Learn more"
      />
    </EuiButton>
  </div>
);

class SetupGuidePage extends React.PureComponent<{ setupOk?: boolean }, { hideToast: boolean }> {
  constructor(props: { setupOk?: boolean }) {
    super(props);

    this.state = {
      hideToast: false,
    };
  }

  public render() {
    let setup = null;
    if (this.props.setupOk !== undefined) {
      setup = (
        <div>
          {!this.state.hideToast && (
            <EuiGlobalToastList
              toasts={[
                {
                  title: i18n.translate('xpack.code.adminPage.setupGuide.permissionChangesTitle', {
                    defaultMessage: 'Permission Changes',
                  }),
                  color: 'primary',
                  iconType: 'iInCircle',
                  text: toastMessage,
                  id: '',
                },
              ]}
              dismissToast={() => {
                this.setState({ hideToast: true });
              }}
              toastLifeTimeMs={10000}
            />
          )}
          <React.Fragment>
            {this.props.setupOk === false && (
              <EuiCallOut title="Code instance not found." color="danger" iconType="cross">
                <p>
                  Please follow the guide below to configure your Kibana instance. Once configured,
                  refresh this page.
                </p>
              </EuiCallOut>
            )}
            {this.props.setupOk === true && (
              <React.Fragment>
                <EuiSpacer size="s" />
                <Link to="/admin">
                  <EuiButton iconType="sortLeft">
                    <FormattedMessage
                      id="xpack.code.adminPage.setupGuide.backToDashboardButtonLabel"
                      defaultMessage="Back To repository dashboard"
                    />
                  </EuiButton>
                </Link>
                <EuiSpacer size="s" />
              </React.Fragment>
            )}
            <EuiPanel>
              <EuiTitle>
                <h3>
                  <FormattedMessage
                    id="xpack.code.adminPage.setupGuide.getStartedTitle"
                    defaultMessage="Getting started in Elastic Code"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer />
              <EuiSteps steps={steps} />
            </EuiPanel>
          </React.Fragment>
        </div>
      );
    }
    return <div className="codeContainer__setup">{setup}</div>;
  }
}

const mapStateToProps = (state: RootState) => ({
  setupOk: state.setup.ok,
});

export const SetupGuide = connect(mapStateToProps)(SetupGuidePage);
