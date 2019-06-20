/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';
// @ts-ignore
import template from 'plugins/xpack_main/views/unavailable/unavailable.html';
import React from 'react';
import { render } from 'react-dom';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('logout', ($scope: any, canAccessKibana: boolean) => {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('reactUnavailableRoot');
      const { title, message, help } = getMessaging(canAccessKibana);

      const dataTestSubj = `unavailable-${canAccessKibana ? 'notFound' : 'unauthorized'}`;

      render(
        <I18nContext>
          <div className="xpkUnavailablePage" data-test-subj={dataTestSubj}>
            <header className="xpkUnavailablePage__header">
              <div className="xpkUnavailablePage__content eui-textCenter">
                <EuiSpacer size="xxl" />
                <span className="xpkUnavailablePage__logo">
                  <EuiIcon type="logoKibana" size="xxl" />
                </span>
                <EuiTitle size="l" className="xpkUnavailablePage__title">
                  <h1 data-test-subj={`${dataTestSubj}-title`}>{title}</h1>
                </EuiTitle>
                <EuiSpacer size="xl" />
              </div>
            </header>
            <div className="xpkUnavailablePage__content eui-textCenter">
              <EuiText>
                <p data-test-subj={`${dataTestSubj}-message`}>{message}</p>
                <p>{help}</p>
              </EuiText>

              <EuiSpacer />

              <EuiFlexGroup justifyContent={'center'}>
                {canAccessKibana && (
                  <EuiFlexItem grow={false}>
                    <EuiButton href={chrome.getBasePath()}>
                      <FormattedMessage
                        id="xpack.main.unavailable.goHome"
                        defaultMessage="Kibana home"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButton href={chrome.addBasePath('/logout')}>
                    <FormattedMessage id="xpack.main.unavailable.logout" defaultMessage="Logout" />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>
        </I18nContext>,
        domNode
      );
    });
  });

function getMessaging(canAccessKibana: boolean) {
  if (canAccessKibana) {
    return {
      title: (
        <FormattedMessage id="xpack.main.unavailable.notFound.title" defaultMessage="Not found" />
      ),
      message: (
        <FormattedMessage
          id="xpack.main.unavailable.notFound.notFoundMessage"
          defaultMessage="Sorry, the requested resource was not found."
        />
      ),
      help: (
        <FormattedMessage
          id="xpack.main.unavailable.notFound.helpMessage"
          defaultMessage="It might be missing, or you might not have access. Contact your administrator for assistance."
        />
      ),
    };
  }

  return {
    title: (
      <FormattedMessage
        id="xpack.main.unavailable.unauthorized.title"
        defaultMessage="No access to Kibana"
      />
    ),
    message: (
      <FormattedMessage
        id="xpack.main.unavailable.unauthorized.notFoundMessage"
        defaultMessage="Your account does not have access to Kibana."
      />
    ),
    help: (
      <FormattedMessage
        id="xpack.main.unavailable.unauthorized.helpMessage"
        defaultMessage="Contact your administrator for assistance."
      />
    ),
  };
}
