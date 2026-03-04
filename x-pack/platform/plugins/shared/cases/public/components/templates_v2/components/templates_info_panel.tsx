/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '../../../common/lib/kibana';
import illustrationRelevance from '../../../assets/illustration-relevance-hand-touch-128.svg';
import * as i18n from '../../templates/translations';

const TemplatesInfoPanelComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { docLinks } = useKibana().services;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      data-test-subj="templates-info-panel"
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.size.s};
        padding: ${euiTheme.size.base};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiImage
            src={illustrationRelevance}
            alt=""
            data-test-subj="templates-info-panel-illustration"
            css={css`
              max-width: 128px;
              max-height: 128px;
            `}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{i18n.TEMPLATES_INFO_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{i18n.TEMPLATES_INFO_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiLink href={docLinks.links.cases.casesPermissions} target="_blank" external>
            {i18n.LEARN_MORE}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

TemplatesInfoPanelComponent.displayName = 'TemplatesInfoPanelComponent';

export const TemplatesInfoPanel = React.memo(TemplatesInfoPanelComponent);
