/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect } from 'react';
import { useHistory, type RouteComponentProps } from 'react-router-dom';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';

import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { TRANSFORM_FUNCTION, type TransformFunction } from '../../../../common/constants';
import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { useSearchItems } from '../../hooks/use_search_items';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';

import { Wizard } from './components/wizard';

type Props = RouteComponentProps<{ savedObjectId?: string }>;

const getInitialTransformFunction = (search: string): TransformFunction => {
  const { transformFunction } = parse(search, { sort: false });
  return transformFunction === TRANSFORM_FUNCTION.LATEST
    ? TRANSFORM_FUNCTION.LATEST
    : TRANSFORM_FUNCTION.PIVOT;
};

export const CreateTransformSection: FC<Props> = ({ location, match }) => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CREATE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const history = useHistory();
  const { esTransform } = useDocumentationLinks();

  const initialTransformFunction = getInitialTransformFunction(location.search);
  const pageTitle =
    initialTransformFunction === TRANSFORM_FUNCTION.LATEST
      ? i18n.translate('xpack.transform.transformsWizard.createLatestTransformTitle', {
          defaultMessage: 'Create latest transform',
        })
      : i18n.translate('xpack.transform.transformsWizard.createPivotTransformTitle', {
          defaultMessage: 'Create pivot transform',
        });
  const {
    error: searchItemsError,
    searchItems,
    setSavedObjectId,
  } = useSearchItems(match.params.savedObjectId);

  return (
    <CapabilitiesWrapper
      requiredCapabilities={[
        'canGetTransform',
        'canPreviewTransform',
        'canCreateTransform',
        'canStartStopTransform',
      ]}
    >
      <AppHeader
        title={pageTitle}
        back={{
          href: history.createHref({ pathname: '/' }),
          label: i18n.translate('xpack.transform.transformList.transformTitle', {
            defaultMessage: 'Transforms',
          }),
        }}
        docLink={esTransform}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      <EuiPageTemplate.Section data-test-subj="transformPageCreateTransform" paddingSize={'none'}>
        {searchItemsError !== undefined && (
          <>
            <KbnDangerCallout announceOnMount={false} title={searchItemsError} />
            <EuiSpacer size="l" />
          </>
        )}
        <Wizard
          initialTransformFunction={initialTransformFunction}
          searchItems={searchItems}
          setSavedObjectId={setSavedObjectId}
        />
      </EuiPageTemplate.Section>
    </CapabilitiesWrapper>
  );
};
