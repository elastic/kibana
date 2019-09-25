/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiPageContentHeader, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Action } from './state_management';

interface Props {
  title: string;
  dispatch: React.Dispatch<Action>;
  children: React.ReactNode | React.ReactNode[];
}

export function WorkspacePanelWrapper({ children, title, dispatch }: Props) {
  return (
    <EuiPageContent className="lnsWorkspacePanelWrapper">
      <EuiPageContentHeader className="lnsWorkspacePanelWrapper__pageContentHeader">
        <input
          type="text"
          className="euiFieldText lnsWorkspacePanelWrapper__titleInput"
          placeholder={i18n.translate('xpack.lens.chartTitlePlaceholder', {
            defaultMessage: 'Title',
          })}
          data-test-subj="lns_ChartTitle"
          value={title}
          onChange={e => dispatch({ type: 'UPDATE_TITLE', title: e.target.value })}
          aria-label={i18n.translate('xpack.lens.chartTitleAriaLabel', {
            defaultMessage: 'Title',
          })}
        />
      </EuiPageContentHeader>
      <EuiPageContentBody className="lnsWorkspacePanelWrapper__pageContentBody">
        {children}
      </EuiPageContentBody>
    </EuiPageContent>
  );
}
