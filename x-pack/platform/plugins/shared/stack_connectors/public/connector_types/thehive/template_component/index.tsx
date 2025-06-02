/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiText,
  EuiSelectable,
  EuiSpacer,
  EuiHighlight,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiSelectableOption,
} from '@elastic/eui';
import { TruncatedText } from './truncated_text';
import * as i18n from './translations';

interface Props {
  buttonTitle: string;
  paramsProperty: string;
  onSelectEventHandler: (template: Template) => void;
}

export interface Template {
  name: string;
  description: string;
}

const templates: Template[] = [
  {
    name: i18n.CUSTOM_TEMPLATE_LABEL,
    description: i18n.CUSTOM_TEMPLATE_DESCRIPTION,
  },
  {
    name: i18n.COMPROMISED_USER_ACCOUNT_INVESTIGATION_LABEL,
    description: i18n.COMPROMISED_USER_ACCOUNT_INVESTIGATION_DESCRIPTION,
  },
  {
    name: i18n.MALICIOUS_FILE_ANALYSIS_LABEL,
    description: i18n.MALICIOUS_FILE_ANALYSIS_DESCRIPTION,
  },
  {
    name: i18n.SUSPICIOUS_NETWORK_ACTIVITY_LABEL,
    description: i18n.SUSPICIOUS_NETWORK_ACTIVITY_DESCRIPTION,
  },
];

const ToolTipContent = React.memo(({ description, label }: { description: string; label: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiText
        size="s"
        style={{
          fontWeight: euiTheme.font.weight.bold,
        }}
      >
        {label}
      </EuiText>
      <EuiSpacer size="s" />
      <hr />
      <EuiSpacer size="s" />
      <EuiText size="xs">{description}</EuiText>
    </>
  );
});

const RenderOption = React.memo(({ option, searchValue }: { option: EuiSelectableOption<{ description?: string }>; searchValue: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup data-test-subj={`templateMenuButton-${option.label}`}>
      <EuiFlexItem>
        <EuiText
          size="s"
          style={{
            fontWeight: euiTheme.font.weight.bold,
          }}
        >
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiText>
        <EuiSpacer size="xs" />
        {option.description && (
          <>
            <EuiToolTip
              display="block"
              position="top"
              content={<ToolTipContent description={option.description} label={option.label} />}
              data-test-subj={`${option.label}-tooltip`}
            >
              <TruncatedText text={option.description || ''} />
            </EuiToolTip>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const TemplateOptions = React.memo(({ buttonTitle, paramsProperty, onSelectEventHandler }: Props) => {
  const [isTemplatesPopoverOpen, setIsTemplatesPopoverOpen] = useState<boolean>(false);

  const templatesObject: Record<string, Template> = {};
  templates?.forEach((template) => {
    templatesObject[template.name] = template;
  });

  const optionsToShow = templates?.map((template) => ({
    label: template.name,
    data: {
      description: template.description,
    },
    'data-test-subj': `${template.name}-selectableOption`,
  }));

  const Button = useMemo(
    () => (
      <EuiButtonIcon
        id={`${paramsProperty}AddVariableButton`}
        data-test-subj={`${paramsProperty}TemplateSelectButton`}
        title={buttonTitle}
        onClick={() => setIsTemplatesPopoverOpen(!isTemplatesPopoverOpen)}
        iconType="documents"
        aria-label={buttonTitle}
      />
    ),
    [buttonTitle, isTemplatesPopoverOpen, paramsProperty]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption<{ description?: string }>, searchValue: string) => (
      <RenderOption option={option} searchValue={searchValue} />
    ),
    []
  );

  return (
    <EuiPopover
      button={Button}
      isOpen={isTemplatesPopoverOpen}
      closePopover={() => setIsTemplatesPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="upLeft"
      panelStyle={{ minWidth: 350 }}
    >
      <EuiSelectable
        height={300}
        data-test-subj={`${paramsProperty}TemplateSelectableList`}
        isLoading={false}
        options={optionsToShow}
        listProps={{
          rowHeight: 70,
          showIcons: false,
          paddingSize: 'none',
          textWrap: 'wrap',
        }}
        renderOption={renderOption}
        onChange={(templateList) => {
          templateList.map((template) => {
            if (template.checked === 'on' && templatesObject) {
              onSelectEventHandler(templatesObject[template.label]);
            }
          });
          setIsTemplatesPopoverOpen(false);
        }}
        singleSelection
      >
        {(list) => <>{list}</>}
      </EuiSelectable>
    </EuiPopover>
  );
});
