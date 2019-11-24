/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { CalendarsSelection } from './components/calendars';
import { CustomUrlsSelection } from './components/custom_urls';

const ButtonContent = <Fragment>Additional settings</Fragment>;

interface Props {
  additionalExpanded: boolean;
  setAdditionalExpanded: (a: boolean) => void;
}

export const AdditionalSection: FC<Props> = ({ additionalExpanded, setAdditionalExpanded }) => {
  return (
    <Fragment>
      <EuiSpacer />
      <EuiAccordion
        id="advanced-section"
        buttonContent={ButtonContent}
        onToggle={setAdditionalExpanded}
        initialIsOpen={additionalExpanded}
      >
        <EuiSpacer />

        <EuiFlexGroup gutterSize="xl" style={{ marginLeft: '0px', marginRight: '0px' }}>
          <EuiFlexItem>
            <CustomUrlsSelection />
            <CalendarsSelection />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </Fragment>
  );
};
