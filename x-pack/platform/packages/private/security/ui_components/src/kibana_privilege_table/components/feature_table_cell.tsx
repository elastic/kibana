/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { SecuredFeature } from '@kbn/security-role-management-model';

interface Props {
  feature: SecuredFeature;
  hasSubFeaturePrivileges?: boolean;
}

const DOCUMENTATION_URL_PATTERN = /https?:\/\/\S+/;

const splitPrivilegesTooltip = (tooltip: string): { text: string; documentationUrl?: string } => {
  const match = tooltip.match(DOCUMENTATION_URL_PATTERN);
  if (!match) {
    return { text: tooltip };
  }

  return {
    text: tooltip.replace(DOCUMENTATION_URL_PATTERN, '').trim(),
    documentationUrl: match[0],
  };
};

const PrivilegesDocumentationTip = ({ feature }: { feature: SecuredFeature }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltip = feature.getPrivilegesTooltip();

  if (!tooltip) {
    return null;
  }

  const { text, documentationUrl } = splitPrivilegesTooltip(tooltip);

  if (!documentationUrl) {
    return (
      <EuiIconTip
        iconProps={{
          className: 'eui-alignTop',
        }}
        type={'info'}
        color={'subdued'}
        content={
          <EuiText>
            <p>{text}</p>
          </EuiText>
        }
      />
    );
  }

  const informationAriaLabel = i18n.translate(
    'xpack.security.management.editRole.featureTable.informationAriaLabel',
    {
      defaultMessage: '{featureName} information',
      values: { featureName: feature.name },
    }
  );
  const documentationLinkLabel = i18n.translate(
    'xpack.security.management.editRole.featureTable.documentationLinkText',
    {
      defaultMessage: 'Documentation',
    }
  );

  return (
    <EuiPopover
      aria-label={informationAriaLabel}
      button={
        <EuiToolTip content={informationAriaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="info"
            iconSize="s"
            color="text"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={informationAriaLabel}
            data-test-subj="featurePrivilegeInformationButton"
            className="eui-alignTop"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="upCenter"
    >
      <EuiText size="s" css={{ maxWidth: 260 }}>
        {text ? <p>{text}</p> : null}
        <EuiLink
          href={documentationUrl}
          target="_blank"
          external
          data-test-subj="featurePrivilegeDocumentationLink"
        >
          {documentationLinkLabel}
        </EuiLink>
      </EuiText>
    </EuiPopover>
  );
};

export const FeatureTableCell = ({ feature, hasSubFeaturePrivileges }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      css={
        !hasSubFeaturePrivileges &&
        css`
          margin-left: calc(${euiTheme.size.l} + ${euiTheme.size.xs});
        `
      }
      direction="column"
      gutterSize="none"
      component="span"
    >
      <EuiFlexItem data-test-subj={`featureTableCell`} component="span">
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem
            css={css`
              &:hover,
              &:focus {
                text-decoration: underline;
              }
            `}
            grow={false}
          >
            {feature.name}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PrivilegesDocumentationTip feature={feature} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {feature.description && (
        <EuiFlexItem>
          <EuiText
            color="subdued"
            size="xs"
            data-test-subj="featurePrivilegeDescriptionText"
            aria-describedby={`${feature.name} description text`}
          >
            {feature.description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
