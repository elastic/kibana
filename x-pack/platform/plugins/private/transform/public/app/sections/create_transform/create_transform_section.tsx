/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonEmpty, EuiCallOut, EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { useSearchItems } from '../../hooks/use_search_items';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';

import { Wizard } from './components/wizard';

type Props = RouteComponentProps<{ savedObjectId: string }>;
export const CreateTransformSection: FC<Props> = ({ match }) => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CREATE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const { esTransform } = useDocumentationLinks();

  const { error: searchItemsError, searchItems } = useSearchItems(match.params.savedObjectId);

  const docsLink = (
    <EuiButtonEmpty
      href={esTransform}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      <FormattedMessage
        id="xpack.transform.transformsWizard.transformDocsLinkText"
        defaultMessage="Transform docs"
      />
    </EuiButtonEmpty>
  );

  return (
    <CapabilitiesWrapper
      requiredCapabilities={[
        'canGetTransform',
        'canPreviewTransform',
        'canCreateTransform',
        'canStartStopTransform',
      ]}
    >
      <EuiPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="xpack.transform.transformsWizard.createTransformTitle"
            defaultMessage="Create transform"
          />
        }
        rightSideItems={[docsLink]}
        bottomBorder
        paddingSize={'none'}
      />

      <EuiSpacer size="l" />

      <EuiPageTemplate.Section data-test-subj="transformPageCreateTransform" paddingSize={'none'}>
        {searchItemsError !== undefined && (
          <>
            <EuiCallOut title={searchItemsError} color="danger" iconType="warning" />
            <EuiSpacer size="l" />
          </>
        )}
        {searchItems !== undefined && <Wizard searchItems={searchItems} />}
      </EuiPageTemplate.Section>
    </CapabilitiesWrapper>
  );
};
