/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useMemo, useState } from 'react';
import { EuiButton, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';

import { Index } from '../../../../..';
import { DetailsPageMappingsContent } from './details_page_mappings_content';

import { useLoadIndexMappings } from '../../../../services';

export const DetailsPageMappings: FunctionComponent<{
  index?: Index;
  showAboutMappings?: boolean;
  hasUpdateMappingsPrivilege?: boolean;
}> = ({ index, showAboutMappings = true, hasUpdateMappingsPrivilege }) => {
  const { isLoading, data, error, resendRequest } = useLoadIndexMappings(index?.name || '');
  const [jsonError, setJsonError] = useState<boolean>(false);

  const stringifiedData = useMemo(() => {
    if (data) {
      try {
        setJsonError(false);
        return JSON.stringify(data, null, 2);
      } catch (e) {
        setJsonError(true);
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.mappings.loadingDescription"
          defaultMessage="Loading index mappings…"
        />
      </SectionLoading>
    );
  }
  if (error || jsonError || !stringifiedData || !index?.name) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsMappingsError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.errorTitle"
              defaultMessage="Unable to load index mappings"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.errorDescription"
                defaultMessage="We encountered an error loading mappings for index {indexName}. Make sure that the index name in the URL is correct and try again."
                values={{
                  indexName: index?.name || undefined,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={resendRequest}
              iconType="refresh"
              color="danger"
              data-test-subj="indexDetailsMappingsReloadButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }

  return (
    <DetailsPageMappingsContent
      index={index}
      data={stringifiedData}
      jsonData={data}
      showAboutMappings={showAboutMappings}
      refetchMapping={resendRequest}
      hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
    />
  );
};
