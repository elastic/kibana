/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { CaseUI } from '../../../../common/ui/types';
import { KibanaServices, useKibana } from '../../../common/lib/kibana';
import {
  INVESTIGATIONS_APP_ID,
  INVESTIGATIONS_OWNER,
} from '../../../../common/investigations/constants';

const TITLE = i18n.translate('xpack.cases.caseView.investigationCallout.title', {
  defaultMessage: 'This case is an investigation',
});
const BODY = i18n.translate('xpack.cases.caseView.investigationCallout.body', {
  defaultMessage:
    'Changes you make here to the title, description, tags, severity, status, assignees, fields, comments, files and external ticket show in the investigation too. This page does not show the investigation evidence and indicators, claims, scope, proposals, procedure, statuses with paused time, agent conversation or outcome.',
});
const OPEN = i18n.translate('xpack.cases.caseView.investigationCallout.open', {
  defaultMessage: 'Open investigation',
});

/** Shown above the case tabs when the case is the root of an investigation. */
export const InvestigationCallout = React.memo<{ caseData: CaseUI }>(({ caseData }) => {
  const { application } = useKibana().services;
  const isInvestigation =
    KibanaServices.getConfig()?.investigations?.enabled === true &&
    caseData.owner === INVESTIGATIONS_OWNER &&
    caseData.tags.includes('investigation');
  const onOpen = useCallback(
    () =>
      application.navigateToApp(INVESTIGATIONS_APP_ID, {
        path: `/${encodeURIComponent(caseData.id)}`,
      }),
    [application, caseData.id]
  );
  if (!isInvestigation) return null;
  return (
    <>
      <KbnInfoCallout
        title={TITLE}
        size="s"
        text={<p>{BODY}</p>}
        actionProps={{
          primary: {
            children: OPEN,
            onClick: onOpen,
            'data-test-subj': 'case-view-open-investigation',
          },
        }}
        data-test-subj="case-view-investigation-callout"
      />
      <EuiSpacer size="m" />
    </>
  );
});
InvestigationCallout.displayName = 'InvestigationCallout';
