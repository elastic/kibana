/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';

import { getIndentedDatasetSettingsFieldsWidthCss } from './dataset_settings_fields_layout';

export const datasetSettingsAccordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

export interface DatasetSettingsSectionAccordionProps {
  id: string;
  title: string;
  initialIsOpen?: boolean;
  borders?: EuiAccordionProps['borders'];
  /** When false, the fields sit directly on the page instead of a filled panel. */
  hasPanelBackground?: boolean;
  dataTestSubj?: string;
  panelDataTestSubj?: string;
  fieldsDataTestSubj?: string;
  children: ReactNode;
}

/**
 * A titled, collapsible section of dataset settings. Shared so that the settings
 * on the schema mappings step read as the same kind of section as the ones on the
 * additional settings step.
 */
export const DatasetSettingsSectionAccordion: FunctionComponent<
  DatasetSettingsSectionAccordionProps
> = ({
  id,
  title,
  initialIsOpen = false,
  borders = 'horizontal',
  hasPanelBackground = true,
  dataTestSubj,
  panelDataTestSubj,
  fieldsDataTestSubj,
  children,
}) => {
  const { euiTheme } = useEuiTheme();

  /**
   * Without a fill to separate them, the fields read as part of the section, so
   * they line up with its title rather than with the arrow that indents it. The
   * accordion button already provides the space above. The indent is a margin
   * on the fields rather than panel padding, so that it eats into their width
   * instead of shifting their right edge past the fields in the other sections.
   */
  const panelProps = hasPanelBackground
    ? ({ color: 'subdued', paddingSize: 'm' } as const)
    : ({
        color: 'transparent',
        paddingSize: 'none',
        css: css`
          padding-block-end: ${euiTheme.size.m};
        `,
      } as const);

  const fieldsCss = hasPanelBackground
    ? undefined
    : getIndentedDatasetSettingsFieldsWidthCss([euiTheme.size.l, euiTheme.size.xs]);

  return (
    <EuiAccordion
      id={id}
      element="fieldset"
      borders={borders}
      buttonProps={{ paddingSize: 'm', css: datasetSettingsAccordionButtonCss }}
      buttonContent={
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      }
      data-test-subj={dataTestSubj}
      initialIsOpen={initialIsOpen}
      paddingSize="none"
    >
      <EuiPanel {...panelProps} hasShadow={false} data-test-subj={panelDataTestSubj}>
        <div css={fieldsCss} data-test-subj={fieldsDataTestSubj}>
          {children}
        </div>
      </EuiPanel>
    </EuiAccordion>
  );
};
