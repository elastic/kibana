/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTabbedContent,
  UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { Response } from '../../types';
import { OutputTab } from './output_tab';
import { ParametersTab } from './parameters_tab';
import { ContextTab } from './context_tab';

const componentStyles = {
  rightPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.emptyShade,
      padding: euiTheme.size.s,
      borderLeft: euiTheme.border.thin,
      height: '100%',
    }),
  tabsStyles: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',

    "[role='tabpanel']": {
      height: '100%',
      overflowY: 'auto',
    },
  }),
};

interface Props {
  isLoading: boolean;
  response?: Response;
}

export const OutputPane: FunctionComponent<Props> = ({ isLoading, response }) => {
  const styles = useMemoCss(componentStyles);
  const outputTabLabel = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : response && response.error ? (
          <EuiIcon type="warning" color="danger" />
        ) : (
          <EuiIcon type="check" color="success" />
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.painlessLab.outputTabLabel', {
          defaultMessage: 'Output',
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div css={styles.rightPane}>
      <EuiTabbedContent
        css={styles.tabsStyles}
        data-test-subj={isLoading ? `painlessTabs-loading` : `painlessTabs-loaded`}
        size="s"
        tabs={[
          {
            id: 'output',
            // TODO: Currently this causes an Eui prop error because it is expecting string, but we give it React.ReactNode - should fix.
            name: outputTabLabel as any,
            content: <OutputTab response={response} />,
          },
          {
            id: 'parameters',
            name: i18n.translate('xpack.painlessLab.parametersTabLabel', {
              defaultMessage: 'Parameters',
            }),
            content: <ParametersTab />,
          },
          {
            id: 'context',
            name: i18n.translate('xpack.painlessLab.contextTabLabel', {
              defaultMessage: 'Context',
            }),
            content: <ContextTab />,
          },
        ]}
      />
    </div>
  );
};
