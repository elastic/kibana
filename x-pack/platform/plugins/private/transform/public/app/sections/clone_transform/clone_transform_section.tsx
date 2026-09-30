/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useHistory, type RouteComponentProps } from 'react-router-dom';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { EuiPageTemplate, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { TransformConfigUnion } from '../../../../common/types/transform';

import { useGetTransform } from '../../hooks';
import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { useSearchItems } from '../../hooks/use_search_items';

import { BREADCRUMB_SECTION, breadcrumbService, docTitleService } from '../../services/navigation';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';

import { Wizard } from '../create_transform/components/wizard';
import { overrideTransformForCloning } from '../../common/transform';

type Props = RouteComponentProps<{ transformId: string }>;

export const CloneTransformSection: FC<Props> = ({ match, location }) => {
  const { dataViewId }: Record<string, any> = parse(location.search, {
    sort: false,
  });
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CLONE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const history = useHistory();
  const { esTransform } = useDocumentationLinks();

  const transformId = match.params.transformId;

  const [transformConfig, setTransformConfig] = useState<TransformConfigUnion>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const { error: searchItemsError, searchItems, setSavedObjectId } = useSearchItems(undefined);

  useEffect(() => {
    if (dataViewId === undefined) {
      setErrorMessage(
        i18n.translate('xpack.transform.clone.fetchErrorPromptText', {
          defaultMessage: 'Could not fetch the Kibana data view ID.',
        })
      );
    } else {
      setSavedObjectId(dataViewId);
    }
  }, [dataViewId, setSavedObjectId]);

  useEffect(() => {
    if (searchItemsError !== undefined) {
      setTransformConfig(undefined);
      setErrorMessage(searchItemsError);
      setIsInitialized(true);
    }
  }, [searchItemsError]);

  const { data: transformConfigs, error } = useGetTransform(
    transformId,
    searchItemsError === undefined
  );

  useEffect(() => {
    if (error !== null && error.message !== errorMessage) {
      setTransformConfig(undefined);
      setErrorMessage(error.message);
      setIsInitialized(true);
      return;
    }

    if (transformConfigs !== undefined) {
      try {
        setTransformConfig(overrideTransformForCloning(transformConfigs.transforms[0]));
        setErrorMessage(undefined);
        setIsInitialized(true);
      } catch (e) {
        setTransformConfig(undefined);
        if (e.message !== undefined) {
          setErrorMessage(e.message);
        } else {
          setErrorMessage(JSON.stringify(e, null, 2));
        }
        setIsInitialized(true);
      }
    }
  }, [error, errorMessage, transformConfigs]);

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
        title={i18n.translate('xpack.transform.transformsWizard.cloneTransformTitle', {
          defaultMessage: 'Clone transform',
        })}
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

      <EuiPageTemplate.Section data-test-subj="transformPageCloneTransform" paddingSize={'none'}>
        {typeof errorMessage !== 'undefined' ? (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('xpack.transform.clone.errorPromptTitle', {
                defaultMessage: 'An error occurred getting the transform configuration.',
              })}
            >
              <pre>{JSON.stringify(errorMessage)}</pre>
            </KbnDangerCallout>
            <EuiSpacer size="l" />
          </>
        ) : searchItems !== undefined && isInitialized === true && transformConfig !== undefined ? (
          <Wizard cloneConfig={transformConfig} searchItems={searchItems} />
        ) : (
          <EuiSkeletonText lines={6} data-test-subj="transformCloneLoading" />
        )}
      </EuiPageTemplate.Section>
    </CapabilitiesWrapper>
  );
};
