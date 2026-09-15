/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React from 'react';
import { css, type SerializedStyles } from '@emotion/react';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';

import {
  getIndentedDatasetSettingsFieldsWidthCss,
  getIndentedDatasetSettingsFullWidthCss,
} from './dataset_settings_fields_layout';

export const datasetSettingsAccordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

/**
 * panel: the content sits in a filled panel.
 * indented: the content sits on the page, lined up under the accordion arrow.
 * indentedFullWidth: same left indent as indented, but content spans to the right edge.
 * plain: the content sits on the page at the full width of the step.
 */
export type DatasetSettingsSectionContentLayout =
  | 'panel'
  | 'indented'
  | 'indentedFullWidth'
  | 'plain';

export interface DatasetSettingsSectionAccordionProps {
  id: string;
  title: string;
  initialIsOpen?: boolean;
  borders?: EuiAccordionProps['borders'];
  contentLayout?: DatasetSettingsSectionContentLayout;
  /** Sits on the header row, opposite the title, without toggling the section. */
  extraAction?: ReactNode;
  forceState?: EuiAccordionProps['forceState'];
  onToggle?: (isOpen: boolean) => void;
  dataTestSubj?: string;
  panelDataTestSubj?: string;
  fieldsDataTestSubj?: string;
  /** Applied only to the fields wrapper inside the accordion body, not the section title. */
  fieldsContainerCss?: SerializedStyles;
  children: ReactNode;
}

/**
 * A titled, collapsible section of dataset settings. Shared so that the sections on the
 * schema mappings step read as the same kind of section as the ones on the additional
 * settings step.
 */
export const DatasetSettingsSectionAccordion: FunctionComponent<
  DatasetSettingsSectionAccordionProps
> = ({
  id,
  title,
  initialIsOpen = false,
  borders = 'horizontal',
  contentLayout = 'panel',
  extraAction,
  forceState,
  onToggle,
  dataTestSubj,
  panelDataTestSubj,
  fieldsDataTestSubj,
  fieldsContainerCss,
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
  const panelProps =
    contentLayout === 'panel'
      ? ({ color: 'subdued', paddingSize: 'm' } as const)
      : ({
          color: 'transparent',
          paddingSize: 'none',
          css: css`
            padding-block-end: ${euiTheme.size.m};
          `,
        } as const);

  const accordionContentIndent = [euiTheme.size.l, euiTheme.size.xs] as const;

  const contentCss =
    contentLayout === 'indented'
      ? getIndentedDatasetSettingsFieldsWidthCss(accordionContentIndent)
      : contentLayout === 'indentedFullWidth'
        ? getIndentedDatasetSettingsFullWidthCss(accordionContentIndent)
        : undefined;

  const fieldsWrapperCss =
    contentCss || fieldsContainerCss
      ? css`
          ${contentCss}
          ${fieldsContainerCss}
        `
      : undefined;

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
      extraAction={extraAction}
      forceState={forceState}
      onToggle={onToggle}
      data-test-subj={dataTestSubj}
      initialIsOpen={initialIsOpen}
      paddingSize="none"
    >
      <EuiPanel {...panelProps} hasShadow={false} data-test-subj={panelDataTestSubj}>
        <div css={fieldsWrapperCss} data-test-subj={fieldsDataTestSubj}>
          {children}
        </div>
      </EuiPanel>
    </EuiAccordion>
  );
};
