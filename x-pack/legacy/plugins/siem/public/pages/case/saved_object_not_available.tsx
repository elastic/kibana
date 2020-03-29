/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EmptyPage } from '../../components/empty_page';
import * as i18n from './translations';
import { useKibana } from '../../lib/kibana';

export const CaseSavedObjectNotAvailable = React.memo(() => {
  const docLinks = useKibana().services.docLinks;

  return (
    <EmptyPage
      actionPrimaryIcon="documents"
      actionPrimaryLabel={i18n.GO_TO_DOCUMENTATION}
      actionPrimaryUrl={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/siem/guide/${docLinks.DOC_LINK_VERSION}s`}
      actionPrimaryTarget="_blank"
      message={'comming soon'}
      data-test-subj="no_saved_objects"
      title={'comming soon'}
    />
  );
});

CaseSavedObjectNotAvailable.displayName = 'CaseSavedObjectNotAvailable';
