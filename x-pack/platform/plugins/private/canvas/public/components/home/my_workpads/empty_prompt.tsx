/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLink, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { CANVAS, JSON } from '../../../../i18n/constants';

export const HomeEmptyPrompt = () => (
  <EuiFlexGroup justifyContent="spaceAround" alignItems="center" style={{ minHeight: 600 }}>
    <EuiFlexItem grow={false}>
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
        <EuiEmptyPrompt
          color="subdued"
          iconType="importAction"
          title={<h2>{strings.getEmptyPromptTitle()}</h2>}
          titleSize="m"
          body={
            <Fragment>
              <p>{strings.getEmptyPromptGettingStartedDescription()}</p>
              <p>
                {strings.getEmptyPromptNewUserDescription()}{' '}
                <EuiLink href="home#/tutorial_directory/sampleData">
                  {strings.getSampleDataLinkLabel()}
                </EuiLink>
                .
              </p>
            </Fragment>
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const strings = {
  getEmptyPromptGettingStartedDescription: () =>
    i18n.translate('xpack.canvas.homeEmptyPrompt.emptyPromptGettingStartedDescription', {
      defaultMessage:
        'Create a new workpad, start from a template, or import a workpad {JSON} file by dropping it here.',
      values: {
        JSON,
      },
    }),
  getEmptyPromptNewUserDescription: () =>
    i18n.translate('xpack.canvas.homeEmptyPrompt.emptyPromptNewUserDescription', {
      defaultMessage: 'New to {CANVAS}?',
      values: {
        CANVAS,
      },
    }),
  getEmptyPromptTitle: () =>
    i18n.translate('xpack.canvas.homeEmptyPrompt.emptyPromptTitle', {
      defaultMessage: 'Add your first workpad',
    }),
  getSampleDataLinkLabel: () =>
    i18n.translate('xpack.canvas.homeEmptyPrompt.sampleDataLinkLabel', {
      defaultMessage: 'Add your first workpad',
    }),
};
