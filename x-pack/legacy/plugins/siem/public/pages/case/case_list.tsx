/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CasesQuery } from '../../containers/case/get_cases';

export const CaseList = React.memo(() => (
  <EuiFlexItem>
    <CasesQuery sourceId="default">
      {children => (
        <EuiText>
          <h2>
            <FormattedMessage
              id="xpack.siem.caseList.total"
              defaultMessage="Showing all {total} cases"
              values={{ total: children.cases.total }}
            />
          </h2>
          <ul>
            {children.cases.saved_objects.map(
              theCase =>
                theCase && (
                  <li key={theCase.id}>
                    <ul>
                      <li>{`Type: ${theCase.attributes.title}`}</li>
                      <li>{`Description: ${theCase.attributes.description}`}</li>
                      <li>{`Type: ${theCase.attributes.case_type}`}</li>
                      <li>{`State: ${theCase.attributes.state}`}</li>
                    </ul>
                  </li>
                )
            )}
          </ul>
        </EuiText>
      )}
    </CasesQuery>
  </EuiFlexItem>
));

CaseList.displayName = 'CaseList';
