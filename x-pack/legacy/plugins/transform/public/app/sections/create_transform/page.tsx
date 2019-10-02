/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { PrivilegesWrapper } from '../../lib/authorization';
import { KibanaProvider } from '../../lib/kibana';

import { Wizard } from './components/wizard';

type Props = RouteComponentProps<{ savedObjectId: string }>;
const CreateTransform = ({ match }: Props) => (
  <KibanaProvider savedObjectId={match.params.savedObjectId}>
    <EuiPage>
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.transform.transformsWizard.createTransformTitle"
                  defaultMessage="Create transform"
                />
                <span>&nbsp;</span>
                <EuiBetaBadge
                  label={i18n.translate('xpack.transform.transformsWizard.betaBadgeLabel', {
                    defaultMessage: `Beta`,
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.transform.transformsWizard.betaBadgeTooltipContent',
                    {
                      defaultMessage: `Transforms are a beta feature. We'd love to hear your feedback.`,
                    }
                  )}
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          <Wizard />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </KibanaProvider>
);

export const Page: FC<Props> = props => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CREATE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  return (
    <PrivilegesWrapper privileges={APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES}>
      <CreateTransform {...props} />
    </PrivilegesWrapper>
  );
};
