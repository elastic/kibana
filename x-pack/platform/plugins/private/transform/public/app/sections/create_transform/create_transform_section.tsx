/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonEmpty, EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';
import { SECTION_SLUG } from '../../common/constants';

import { Wizard } from './components/wizard';

type Props = RouteComponentProps<{ savedObjectId?: string }>;
export const CreateTransformSection: FC<Props> = ({ match, history }) => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CREATE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const { esTransform } = useDocumentationLinks();
  const defaultSavedObjectId = match.params.savedObjectId;
  const onSavedObjectSelected = useCallback(
    (savedObjectId: string) => {
      history.push(`/${SECTION_SLUG.CREATE_TRANSFORM}/${savedObjectId}`);
    },
    [history]
  );

  const docsLink = (
    <EuiButtonEmpty
      href={esTransform}
      target="_blank"
      iconType="question"
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
        <Wizard
          defaultSavedObjectId={defaultSavedObjectId}
          onSavedObjectSelected={onSavedObjectSelected}
        />
      </EuiPageTemplate.Section>
    </CapabilitiesWrapper>
  );
};
