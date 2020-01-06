/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { documentationLinks } from 'ui/documentation_links';

import { EmptyPage } from '../../components/empty_page';
import * as i18n from './translations';

export const DetectionEngineNoIndex = React.memo(() => (
  <EmptyPage
    actionPrimaryIcon="documents"
    actionPrimaryLabel={i18n.GO_TO_DOCUMENTATION}
    actionPrimaryUrl={documentationLinks.siem}
    actionPrimaryTarget="_blank"
    message={i18n.NO_INDEX_MSG_BODY}
    data-test-subj="no_index"
    title={i18n.NO_INDEX_TITLE}
  />
));

DetectionEngineNoIndex.displayName = 'DetectionEngineNoIndex';
