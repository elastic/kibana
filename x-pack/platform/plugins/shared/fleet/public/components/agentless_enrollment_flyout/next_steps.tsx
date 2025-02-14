/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiCard,
  EuiFlexGroup,
  EuiButton,
  EuiHorizontalRule,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../hooks';
import type { PackagePolicy, RegistryPolicyTemplate } from '../../types';
import { ELASTICSEARCH_PLUGIN_ID } from '../../../common/constants/plugin';

export const NextSteps = ({
  packagePolicy,
  policyTemplates,
}: {
  packagePolicy: PackagePolicy;
  policyTemplates?: RegistryPolicyTemplate[];
}) => {
  const { application } = useStartServices();

  const configurationLinks = useMemo(() => {
    if (policyTemplates) {
      return policyTemplates
        ?.filter(
          (template) => template?.configuration_links && template.configuration_links.length > 0
        )
        .flatMap((template) => template.configuration_links);
    }
    return [];
  }, [policyTemplates]);

  const parseKbnLink = (url: string) => {
    // matching strings with format kbn:/app/appId/path/optionalsubpath
    const matches = url.match(/kbn:\/app\/(\w*)\/(\w*\/*)*/);
    if (matches && matches.length > 0) {
      const appId = matches[1];
      const path = matches[2];
      return { appId, path };
    }
    return undefined;
  };

  const isExternal = (url: string) => url.startsWith('http') || url.startsWith('https');
  const onClickLink = useCallback(
    (url?: string) => {
      if (!url) return undefined;

      if (isExternal(url)) {
        application.navigateToUrl(`${url}`);
      } else if (url.startsWith('kbn:/')) {
        const parsedLink = parseKbnLink(url);
        if (parsedLink) {
          const { appId, path } = parsedLink;
          application.navigateToApp(appId, {
            path,
          });
        }
      }
    },
    [application]
  );

  const nextStepsCards = configurationLinks
    .filter((link) => link?.type === 'next_step')
    .map((link, index) => {
      return (
        <EuiFlexItem key={index}>
          <EuiCard
            data-test-subj={`agentlessStepConfirmData.connectorCard.${link?.title}`}
            title={`${link?.title}`}
            description={`${link?.content}`}
            onClick={() => onClickLink(link?.url)}
          />
        </EuiFlexItem>
      );
    });

  const connectorCards = packagePolicy.inputs
    .filter((input) => !!input?.vars?.connector_id?.value || !!input?.vars?.connector_name?.value)
    .map((input, index) => {
      return (
        <EuiFlexItem key={index}>
          <EuiCard
            data-test-subj={`agentlessStepConfirmData.connectorCard.${input?.vars?.connector_name?.value}`}
            title={`${input?.vars?.connector_name.value}`}
            description={i18n.translate(
              'xpack.fleet.agentlessStepConfirmData.connectorCard.description',
              {
                defaultMessage: 'Configure Connector',
              }
            )}
            onClick={() => {
              application.navigateToApp(ELASTICSEARCH_PLUGIN_ID, {
                path: input?.vars?.connector_id?.value
                  ? `content/connectors/${input?.vars?.connector_id?.value}`
                  : `content/connectors`,
              });
            }}
          />
        </EuiFlexItem>
      );
    });

  const actionButtons = configurationLinks
    .filter((link) => !!link && link?.type === 'action')
    .map((link, index) => {
      return (
        <EuiFlexItem key={index} grow={false}>
          <EuiButton
            data-test-subj={`agentlessStepConfirmData.connectorCard.${link?.title}`}
            iconType="link"
            onClick={() => onClickLink(link?.url)}
          >
            {link?.title}
          </EuiButton>
        </EuiFlexItem>
      );
    });

  return (
    <>
      <EuiSpacer size="m" />
      {(nextStepsCards.length > 0 || connectorCards.length > 0) && (
        <EuiFlexGroup alignItems="center" direction="row" wrap={true}>
          {nextStepsCards}
          {connectorCards}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />
      <EuiHorizontalRule />
      {actionButtons.length > 0 && (
        <EuiFlexGroup alignItems="center" direction="row" wrap={true}>
          {actionButtons}
        </EuiFlexGroup>
      )}
    </>
  );
};
