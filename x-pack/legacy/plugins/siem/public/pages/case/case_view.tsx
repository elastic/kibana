/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CaseQuery } from '../../containers/case/get_case';

export const CaseView = React.memo(() => (
  <EuiFlexItem>
    <CaseQuery sourceId="default" caseId="9ffef520-20e4-11ea-8f80-690fedc74682">
      {children => (
        <EuiText>
          <h2>{children.case.attributes.title}</h2>
          <dl className="eui-definitionListReverse">
            <dt>
              <FormattedMessage id="xpack.siem.caseView.description" defaultMessage="Description" />
            </dt>
            <dd>{children.case.attributes.description}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.case_type" defaultMessage="Case type" />
            </dt>
            <dd>{children.case.attributes.case_type}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.state" defaultMessage="State" />
            </dt>
            <dd>{children.case.attributes.state}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.updated_at" defaultMessage="Last updated" />
            </dt>
            <dd>{children.case.updated_at}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.created_at" defaultMessage="Created at" />
            </dt>
            <dd>{children.case.attributes.created_at}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.created_by" defaultMessage="Created by" />
            </dt>
            <dd>{children.case.attributes.created_by.username}</dd>
            <dt>
              <FormattedMessage id="xpack.siem.caseView.tags" defaultMessage="Tags" />
            </dt>
            <dd>
              <ul>
                {children.case.attributes.tags.map((tag, key) => (
                  <li key={key}>{tag}</li>
                ))}
              </ul>
            </dd>
          </dl>
        </EuiText>
      )}
    </CaseQuery>
  </EuiFlexItem>
));

CaseView.displayName = 'CaseView';
